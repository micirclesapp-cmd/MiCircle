import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { isValidTrainNumber } from '../../services/transit.service';
import type { CircleCategory, TransitMode, JoinMode } from '../../types/feed.types';

const DRAFT_KEY = '@create_circle_draft';

type FeedStackParamList = {
  CreateOpenCircleScreen: undefined;
  OpenCircleDetailScreen: { circleId: string };
};

type CreateOpenCircleScreenNavigationProp = StackNavigationProp<
  FeedStackParamList,
  'CreateOpenCircleScreen'
>;

const CATEGORY_OPTIONS: Array<{ value: CircleCategory; label: string; icon: string }> = [
  { value: 'travel', label: 'Travel & Transit', icon: '🚆' },
  { value: 'fitness', label: 'Fitness', icon: '🏃' },
  { value: 'music', label: 'Music & Arts', icon: '🎵' },
  { value: 'food', label: 'Food & Dining', icon: '🍜' },
  { value: 'hobby', label: 'Hobby', icon: '🎯' },
  { value: 'neighbourhood', label: 'Neighbourhood', icon: '🏘' },
  { value: 'professional', label: 'Professional', icon: '💼' },
  { value: 'other', label: 'Other', icon: '✨' },
];

export const CreateOpenCircleScreen: React.FC = () => {
  const navigation = useNavigation<CreateOpenCircleScreenNavigationProp>();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [category, setCategory] = useState<CircleCategory | null>(null);
  const [name, setName] = useState('');
  const [pitch, setPitch] = useState('');
  const [transitMode, setTransitMode] = useState<TransitMode | null>(null);
  const [transitRoute, setTransitRoute] = useState('');
  const [transitDate, setTransitDate] = useState('');
  const [city, setCity] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [publishing, setPublishing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftStr = await AsyncStorage.getItem(DRAFT_KEY);
        if (draftStr) {
          Alert.alert(
            'Restore Draft?',
            'You have an unsaved circle. Do you want to restore it?',
            [
              { 
                text: 'Discard', 
                style: 'destructive',
                onPress: () => {
                  AsyncStorage.removeItem(DRAFT_KEY);
                  setIsRestoring(false);
                }
              },
              { 
                text: 'Restore', 
                onPress: () => {
                  const draft = JSON.parse(draftStr);
                  setCategory(draft.category || null);
                  setName(draft.name || '');
                  setPitch(draft.pitch || '');
                  setTransitMode(draft.transitMode || null);
                  setTransitRoute(draft.transitRoute || '');
                  setTransitDate(draft.transitDate || '');
                  setCity(draft.city || '');
                  setNeighbourhood(draft.neighbourhood || '');
                  setTags(draft.tags || []);
                  setJoinMode(draft.joinMode || 'open');
                  setStep(draft.step || 1);
                  setIsRestoring(false);
                } 
              }
            ]
          );
        } else {
          setIsRestoring(false);
        }
      } catch (e) {
        setIsRestoring(false);
      }
    };
    loadDraft();
  }, []);

  useEffect(() => {
    if (isRestoring) return;
    const saveDraft = async () => {
      const draft = {
        category, name, pitch, transitMode, transitRoute, transitDate, city, neighbourhood, tags, joinMode, step
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    };
    saveDraft();
  }, [category, name, pitch, transitMode, transitRoute, transitDate, city, neighbourhood, tags, joinMode, step, isRestoring]);

  const getPlaceholder = () => {
    switch (category) {
      case 'travel': return '12163 Chennai Express — 20 April';
      case 'fitness': return 'Morning Walkers — Koramangala 6AM';
      case 'food': return 'Sunday Brunch Club — Indiranagar';
      case 'music': return 'Guitar Jam Sessions — Weekends';
      default: return 'Give your circle a catchy name';
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5) {
      const tag = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const executePublish = async () => {
    try {
      // Prepare circle data
      const circleData: any = {
        name,
        category,
        pitch,
        tags,
        joinMode,
        creatorUid: currentUser!.uid,
        creatorName: currentUser!.displayName || 'Unknown',
        creatorAvatar: currentUser!.photoURL || '',
        creatorJoinYear: new Date().getFullYear(),
        memberCount: 1,
        members: [currentUser!.uid],
        isArchived: false,
        isPromoted: false,
        createdAt: Date.now(), // Store as milliseconds for easier querying
      };

      if (category === 'travel' && transitMode && transitRoute && transitDate) {
        circleData.transitMode = transitMode;
        circleData.transitRoute = transitRoute;
        circleData.transitDate = transitDate;
      } else {
        circleData.city = city;
        circleData.location = neighbourhood ? `${neighbourhood}, ${city}` : city;
      }

      const circlesRef = collection(firestore, 'public_circles');
      const docRef = await addDoc(circlesRef, circleData);

      await AsyncStorage.removeItem(DRAFT_KEY);

      Alert.alert('Success', 'Your circle is live! 🎉');
      navigation.navigate('OpenCircleDetailScreen', { circleId: docRef.id });
    } catch (error) {
      console.error('Error publishing circle:', error);
      Alert.alert('Error', 'Failed to publish circle. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async () => {
    if (!currentUser || !category) return;

    setPublishing(true);

    try {
      // F-12: New Account re-auth check
      const creationTime = currentUser.metadata.creationTime;
      if (creationTime) {
        const ageInMs = Date.now() - new Date(creationTime).getTime();
        if (ageInMs < 24 * 60 * 60 * 1000) {
          // For MVP, just alert. In production we'd call reauthenticateWithCredential.
          Alert.alert('Security Check', 'As a new user, please verify your email before posting.', [{ text: 'OK' }]);
          setPublishing(false);
          return;
        }
      }

      // F-11 & F-12: Date validation
      if (category === 'travel' && transitDate) {
        const tDate = new Date(transitDate);
        tDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (tDate < today) {
          Alert.alert('Invalid Date', 'Travel date must be today or in the future.');
          setPublishing(false);
          return;
        }
      }

      // F-12: Spam Throttle & Duplicate detection
      const last24h = Date.now() - 24 * 60 * 60 * 1000;
      const q = query(
        collection(firestore, 'public_circles'), 
        where('creatorUid', '==', currentUser.uid),
        where('createdAt', '>=', last24h)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.size >= 3) {
        Alert.alert('Limit Reached', 'You have reached your daily limit of 3 circles. Upgrade to Circles+ for more.');
        setPublishing(false);
        return;
      }

      const duplicate = snapshot.docs.some(doc => doc.data().name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        Alert.alert('Duplicate', "You've recently posted a circle with a similar name.");
        setPublishing(false);
        return;
      }

      // F-12: Content Moderation
      const { checkContent, getModerationErrorMessage } = await import('../../services/moderation.service');
      
      const nameResult = await checkContent(name);
      if (!nameResult.isSafe) {
        Alert.alert('Content Not Allowed', getModerationErrorMessage(nameResult));
        setPublishing(false);
        return;
      }

      const pitchResult = await checkContent(pitch);
      if (!pitchResult.isSafe) {
        Alert.alert('Content Not Allowed', getModerationErrorMessage(pitchResult));
        setPublishing(false);
        return;
      }

      if (tags.length > 0) {
        const tagsResult = await checkContent(tags.join(' '));
        if (!tagsResult.isSafe) {
          Alert.alert('Tags Not Allowed', 'One or more tags contain inappropriate content.');
          setPublishing(false);
          return;
        }
      }

      // F-11: Train number soft validation
      if (category === 'travel' && transitMode === 'train' && transitRoute) {
        if (!isValidTrainNumber(transitRoute)) {
          Alert.alert(
            'Unknown Train Number',
            'This train number is not recognized. Do you want to proceed anyway?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setPublishing(false) },
              { text: 'Proceed', onPress: () => executePublish() }
            ]
          );
          return; // Wait for user decision
        }
      }

      // If all passed, execute publish
      await executePublish();

    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'An error occurred during validation.');
      setPublishing(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => (step > 1 ? setStep((step - 1) as any) : navigation.goBack())}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.progressDots}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View
            key={s}
            style={[styles.progressDot, s <= step && styles.progressDotActive]}
          />
        ))}
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 1: Category
  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your circle about?</Text>
      <View style={styles.categoryGrid}>
        {CATEGORY_OPTIONS.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryCard,
              category === cat.value && styles.categoryCardSelected,
            ]}
            onPress={() => {
              setCategory(cat.value);
              setStep(2);
            }}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // Step 2: Name & Pitch
  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Name your circle</Text>
      <TextInput
        style={styles.input}
        placeholder={getPlaceholder()}
        value={name}
        onChangeText={setName}
        maxLength={60}
        placeholderTextColor={Colors.textTertiary}
      />
      <Text style={styles.charCount}>{name.length}/60</Text>

      <Text style={[styles.stepTitle, { marginTop: 24 }]}>Write a short pitch</Text>
      <Text style={styles.subtitle}>Who are you, and who are you looking for?</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell people what this circle is about..."
        value={pitch}
        onChangeText={setPitch}
        maxLength={140}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholderTextColor={Colors.textTertiary}
      />
      <Text style={styles.charCount}>{pitch.length}/140</Text>

      <TouchableOpacity
        style={[styles.nextButton, (!name || !pitch) && styles.nextButtonDisabled]}
        onPress={() => setStep(3)}
        disabled={!name || !pitch}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Step 3: Context
  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer}>
      {category === 'travel' ? (
        <>
          <Text style={styles.stepTitle}>Transit Details</Text>
          <Text style={styles.subtitle}>Select your mode of travel</Text>
          <View style={styles.modeButtons}>
            {(['train', 'flight', 'bus'] as TransitMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  transitMode === mode && styles.modeButtonSelected,
                ]}
                onPress={() => setTransitMode(mode)}
              >
                <Text style={styles.modeButtonText}>
                  {mode === 'train' ? '🚂 Train' : mode === 'flight' ? '✈️ Flight' : '🚌 Bus'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>
            {transitMode === 'train' ? 'Train Number' : transitMode === 'flight' ? 'Flight Code' : 'Route / Bus Number'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              transitMode === 'train' ? 'e.g. 12163' : transitMode === 'flight' ? 'e.g. 6E456' : 'e.g. Bangalore - Chennai'
            }
            value={transitRoute}
            onChangeText={setTransitRoute}
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={transitDate}
            onChangeText={setTransitDate}
            placeholderTextColor={Colors.textTertiary}
          />
        </>
      ) : (
        <>
          <Text style={styles.stepTitle}>Location</Text>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city name"
            value={city}
            onChangeText={setCity}
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>
            Neighbourhood or Landmark (Optional)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Koramangala, Indiranagar"
            value={neighbourhood}
            onChangeText={setNeighbourhood}
            placeholderTextColor={Colors.textTertiary}
          />
        </>
      )}

      <TouchableOpacity
        style={[
          styles.nextButton,
          (category === 'travel' ? !transitMode || !transitRoute || !transitDate : !city) && styles.nextButtonDisabled,
        ]}
        onPress={() => setStep(4)}
        disabled={category === 'travel' ? !transitMode || !transitRoute || !transitDate : !city}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Step 4: Tags
  const renderStep4 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add up to 5 keywords</Text>
      <View style={styles.tagInputContainer}>
        <TextInput
          style={styles.tagInput}
          placeholder="Type a tag and press Enter"
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          placeholderTextColor={Colors.textTertiary}
        />
        <TouchableOpacity
          style={styles.addTagButton}
          onPress={handleAddTag}
          disabled={tags.length >= 5}
        >
          <Text style={styles.addTagButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tagsContainer}>
        {tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
            <TouchableOpacity onPress={() => handleRemoveTag(index)}>
              <Text style={styles.tagRemove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.suggestionsTitle}>Suggestions</Text>
      <View style={styles.suggestionsContainer}>
        {['morning', 'weekend', 'beginner', 'friendly', 'casual'].map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            style={styles.suggestionChip}
            onPress={() => {
              if (tags.length < 5 && !tags.includes(suggestion)) {
                setTags([...tags, suggestion]);
              }
            }}
            disabled={tags.length >= 5 || tags.includes(suggestion)}
          >
            <Text style={styles.suggestionText}>#{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={() => setStep(5)}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Step 5: Join Mode
  const renderStep5 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Who can join?</Text>

      <TouchableOpacity
        style={[styles.joinModeCard, joinMode === 'open' && styles.joinModeCardSelected]}
        onPress={() => setJoinMode('open')}
      >
        <View style={styles.radioButton}>
          {joinMode === 'open' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.joinModeContent}>
          <Text style={styles.joinModeTitle}>Open — Anyone joins instantly</Text>
          <Text style={styles.joinModeSubtitle}>Recommended for transit and time-sensitive circles</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.joinModeCard, joinMode === 'approval' && styles.joinModeCardSelected]}
        onPress={() => setJoinMode('approval')}
      >
        <View style={styles.radioButton}>
          {joinMode === 'approval' && <View style={styles.radioButtonInner} />}
        </View>
        <View style={styles.joinModeContent}>
          <Text style={styles.joinModeTitle}>Approval Required — You review each request</Text>
          <Text style={styles.joinModeSubtitle}>You'll get notified when someone wants to join</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
        onPress={handlePublish}
        disabled={publishing}
      >
        {publishing ? (
          <ActivityIndicator color={Colors.surface} />
        ) : (
          <Text style={styles.publishButtonText}>Post Circle</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  if (isRestoring) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {renderProgressBar()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    aspectRatio: 1.2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
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
  charCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modeButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  addTagButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addTagButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface,
  },
  tagRemove: {
    fontSize: 20,
    color: Colors.surface,
    fontWeight: '600',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  suggestionChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  joinModeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  joinModeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  joinModeContent: {
    flex: 1,
  },
  joinModeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  joinModeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
  publishButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
});

export default CreateOpenCircleScreen;
