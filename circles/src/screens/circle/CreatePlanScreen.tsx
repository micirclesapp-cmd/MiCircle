import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { firestore, db, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import type { PlanType } from '../../types/plan.types';

type CircleStackParamList = {
  CreatePlanScreen: { circleId: string; prefilledDate?: string; prefilledRSVPs?: string[] };
  CirclePlannerScreen: { circleId: string };
};

type CreatePlanScreenNavigationProp = StackNavigationProp<
  CircleStackParamList,
  'CreatePlanScreen'
>;

type CreatePlanScreenRouteProp = RouteProp<
  CircleStackParamList,
  'CreatePlanScreen'
>;

interface PlanDetails {
  // Meal
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  venueName?: string;
  headCount?: number;

  // Movie
  filmTitle?: string;
  cinemaName?: string;
  bookingUrl?: string;

  // Trip
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  budgetPerPerson?: string;
  notes?: string;

  // Custom
  title?: string;
  location?: string;
}

export const CreatePlanScreen: React.FC = () => {
  const navigation = useNavigation<CreatePlanScreenNavigationProp>();
  const route = useRoute<CreatePlanScreenRouteProp>();
  const { circleId, prefilledDate, prefilledRSVPs } = route.params;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<PlanType | null>(null);
  const [date, setDate] = useState(prefilledDate ? prefilledDate.split('T')[0] : '');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState<PlanDetails>({});
  const [publishing, setPublishing] = useState(false);

  const currentUser = auth.currentUser;

  // Step 1: Plan Type Selection
  const planTypes: Array<{ type: PlanType; label: string; icon: string }> = [
    { type: 'meal', label: 'Meal', icon: '🍽' },
    { type: 'movie', label: 'Movie', icon: '🎬' },
    { type: 'trip', label: 'Trip', icon: '✈️' },
    { type: 'custom', label: 'Custom', icon: '📌' },
  ];

  const handleTypeSelect = (type: PlanType) => {
    setSelectedType(type);
    setStep(2);
  };

  // Step 2: Fill Details
  const updateDetail = (key: keyof PlanDetails, value: any) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    // Validate required fields
    if (!date) {
      Alert.alert('Missing Information', 'Please select a date');
      return;
    }

    if (selectedType === 'meal') {
      if (!details.mealType || !details.venueName) {
        Alert.alert('Missing Information', 'Please fill all required fields');
        return;
      }
    } else if (selectedType === 'movie') {
      if (!details.filmTitle || !details.cinemaName || !time) {
        Alert.alert('Missing Information', 'Please fill all required fields');
        return;
      }
    } else if (selectedType === 'trip') {
      if (!details.destination || !details.departureDate || !details.returnDate) {
        Alert.alert('Missing Information', 'Please fill all required fields');
        return;
      }
    } else if (selectedType === 'custom') {
      if (!details.title) {
        Alert.alert('Missing Information', 'Please enter a title');
        return;
      }
    }

    setStep(3);
  };

  // Step 3: Publish
  const handlePublish = async () => {
    if (!currentUser || !selectedType) return;

    setPublishing(true);

    try {
      // Generate plan title based on type
      let planTitle = '';
      let planLocation = '';

      if (selectedType === 'meal') {
        planTitle = `${details.mealType?.charAt(0).toUpperCase()}${details.mealType?.slice(1)} at ${details.venueName}`;
        planLocation = details.venueName || '';
      } else if (selectedType === 'movie') {
        planTitle = details.filmTitle || '';
        planLocation = details.cinemaName || '';
      } else if (selectedType === 'trip') {
        planTitle = `Trip to ${details.destination}`;
        planLocation = details.destination || '';
      } else if (selectedType === 'custom') {
        planTitle = details.title || '';
        planLocation = details.location || '';
      }

      // Prepare initial RSVPs if any
      const initialRsvps: Record<string, string> = {};
      if (prefilledRSVPs && prefilledRSVPs.length > 0) {
        prefilledRSVPs.forEach((uid) => {
          initialRsvps[uid] = 'going';
        });
      }

      // 1. Write to Firestore
      const plansRef = collection(firestore, 'circles', circleId, 'plans');
      const planDoc = await addDoc(plansRef, {
        circleId,
        type: selectedType,
        title: planTitle,
        date,
        time: time || null,
        location: planLocation || null,
        details,
        creatorUid: currentUser.uid,
        creatorName: currentUser.displayName || 'Unknown',
        rsvps: initialRsvps,
        createdAt: Date.now(),
        isArchived: false,
      });

      // 2. Write special message to Realtime DB
      const messagesRef = ref(db, `circles/${circleId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        type: 'plan_card',
        planId: planDoc.id,
        planTitle,
        planDate: date,
        planTime: time || null,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Unknown',
        createdAt: Date.now(),
      });

      // 3. Update circle's lastMessageAt
      const circleRef = doc(firestore, 'circles', circleId);
      await updateDoc(circleRef, {
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: `📅 ${planTitle}`,
        lastSenderName: currentUser.displayName || 'Unknown',
      });

      // 4. TODO: Send FCM push notification to all members
      // This would typically be done via a Cloud Function
      // For now, we'll skip this step

      // Navigate back to planner screen
      navigation.navigate('CirclePlannerScreen', { circleId });
    } catch (error) {
      console.error('Error publishing plan:', error);
      Alert.alert('Error', 'Failed to publish plan. Please try again.');
      setPublishing(false);
    }
  };

  // Render Step 1: Choose Type
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Plan Type</Text>
      <View style={styles.typeGrid}>
        {planTypes.map((planType) => (
          <TouchableOpacity
            key={planType.type}
            style={styles.typeCard}
            onPress={() => handleTypeSelect(planType.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.typeIcon}>{planType.icon}</Text>
            <Text style={styles.typeLabel}>{planType.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render Step 2: Fill Details
  const renderStep2 = () => {
    if (!selectedType) return null;

    return (
      <ScrollView style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Plan Details</Text>

        {/* Common Fields: Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        {/* Meal Type Fields */}
        {selectedType === 'meal' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={time}
                onChangeText={setTime}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Meal Type *</Text>
              <View style={styles.chipGroup}>
                {['breakfast', 'lunch', 'dinner'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      details.mealType === type && styles.chipSelected,
                    ]}
                    onPress={() => updateDetail('mealType', type)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        details.mealType === type && styles.chipTextSelected,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Venue Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter venue name"
                value={details.venueName}
                onChangeText={(text) => updateDetail('venueName', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Head Count</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    updateDetail(
                      'headCount',
                      Math.max(1, (details.headCount || 1) - 1)
                    )
                  }
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{details.headCount || 1}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    updateDetail('headCount', (details.headCount || 1) + 1)
                  }
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Movie Type Fields */}
        {selectedType === 'movie' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={time}
                onChangeText={setTime}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Film Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter film title"
                value={details.filmTitle}
                onChangeText={(text) => updateDetail('filmTitle', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Cinema Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cinema name"
                value={details.cinemaName}
                onChangeText={(text) => updateDetail('cinemaName', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Booking URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                value={details.bookingUrl}
                onChangeText={(text) => updateDetail('bookingUrl', text)}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* Trip Type Fields */}
        {selectedType === 'trip' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Destination *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter destination"
                value={details.destination}
                onChangeText={(text) => updateDetail('destination', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Departure Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={details.departureDate}
                onChangeText={(text) => updateDetail('departureDate', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Return Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={details.returnDate}
                onChangeText={(text) => updateDetail('returnDate', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Budget per Person (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={details.budgetPerPerson}
                onChangeText={(text) => updateDetail('budgetPerPerson', text)}
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional notes..."
                value={details.notes}
                onChangeText={(text) => updateDetail('notes', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </>
        )}

        {/* Custom Type Fields */}
        {selectedType === 'custom' && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter plan title"
                value={details.title}
                onChangeText={(text) => updateDetail('title', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Time (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={time}
                onChangeText={setTime}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                value={details.location}
                onChangeText={(text) => updateDetail('location', text)}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional notes..."
                value={details.notes}
                onChangeText={(text) => updateDetail('notes', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </>
        )}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Render Step 3: Review & Publish
  const renderStep3 = () => {
    if (!selectedType) return null;

    let planTitle = '';
    let planLocation = '';

    if (selectedType === 'meal') {
      planTitle = `${details.mealType?.charAt(0).toUpperCase()}${details.mealType?.slice(1)} at ${details.venueName}`;
      planLocation = details.venueName || '';
    } else if (selectedType === 'movie') {
      planTitle = details.filmTitle || '';
      planLocation = details.cinemaName || '';
    } else if (selectedType === 'trip') {
      planTitle = `Trip to ${details.destination}`;
      planLocation = details.destination || '';
    } else if (selectedType === 'custom') {
      planTitle = details.title || '';
      planLocation = details.location || '';
    }

    return (
      <ScrollView style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Review & Publish</Text>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{planTitle}</Text>
          <Text style={styles.reviewDetail}>📅 {date}</Text>
          {time && <Text style={styles.reviewDetail}>🕐 {time}</Text>}
          {planLocation && <Text style={styles.reviewDetail}>📍 {planLocation}</Text>}

          {selectedType === 'meal' && details.headCount && (
            <Text style={styles.reviewDetail}>👥 {details.headCount} people</Text>
          )}

          {selectedType === 'movie' && details.bookingUrl && (
            <Text style={styles.reviewDetail}>🔗 {details.bookingUrl}</Text>
          )}

          {selectedType === 'trip' && (
            <>
              <Text style={styles.reviewDetail}>
                🛫 Departure: {details.departureDate}
              </Text>
              <Text style={styles.reviewDetail}>
                🛬 Return: {details.returnDate}
              </Text>
              {details.budgetPerPerson && (
                <Text style={styles.reviewDetail}>
                  💰 ₹{details.budgetPerPerson} per person
                </Text>
              )}
            </>
          )}

          {details.notes && (
            <Text style={styles.reviewNotes}>📝 {details.notes}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={publishing}
        >
          {publishing ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.publishButtonText}>Publish to Circle</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(2)}
          disabled={publishing}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  typeCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.surface,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 24,
    color: Colors.surface,
    fontWeight: '600',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  reviewDetail: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  reviewNotes: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  publishButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
  backButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
