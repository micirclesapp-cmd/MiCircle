import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenLayout } from '../../components/shared/ScreenLayout';
import { Colors } from '../../constants/colors';
import { PlanType } from '../../types/plan.types';
import { createPlan } from '../../services/plan.service';
import { searchRestaurants, searchMovies, PlaceResult, MovieResult } from '../../services/externalApi.service';
import { auth } from '../../services/firebase';

const PLAN_TYPES: { label: string; value: PlanType; icon: string }[] = [
  { label: 'Meal', value: 'meal', icon: '🍽' },
  { label: 'Movie', value: 'movie', icon: '🎬' },
  { label: 'Trip', value: 'trip', icon: '✈️' },
  { label: 'Custom', value: 'custom', icon: '📌' },
];

export default function CreatePlanScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { circleId } = route.params;

  const [type, setType] = useState<PlanType>('meal');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState('');
  
  // Specific fields
  const [mealType, setMealType] = useState('dinner');
  const [headCount, setHeadCount] = useState('');
  const [locationStr, setLocationStr] = useState(''); // Restaurant query or general location
  const [movieQuery, setMovieQuery] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  // Search Results
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentUser = auth.currentUser;

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSearchPlaces = async () => {
    if (locationStr.length < 3) return;
    setSearching(true);
    const results = await searchRestaurants(locationStr);
    setPlaces(results);
    setSearching(false);
  };

  const handleSearchMovies = async () => {
    if (movieQuery.length < 3) return;
    setSearching(true);
    const results = await searchMovies(movieQuery);
    setMovies(results);
    setSearching(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the plan');
      return;
    }
    if (!currentUser) return;

    setSubmitting(true);

    const details: Record<string, any> = { notes };
    if (type === 'meal') {
      details.mealType = mealType;
      details.headCount = parseInt(headCount, 10) || undefined;
    } else if (type === 'movie') {
      details.bookingUrl = bookingUrl;
      details.movieTitle = movieQuery;
    } else if (type === 'trip') {
      details.departureDate = departureDate;
      details.returnDate = returnDate;
      details.budgetPerPerson = parseFloat(budget) || undefined;
    }

    const { success, error } = await createPlan({
      circleId,
      title,
      type,
      date: date.toISOString(),
      time,
      location: type === 'movie' ? 'Cinema' : locationStr,
      details,
      creatorName: currentUser.displayName || 'Someone',
    });

    setSubmitting(false);

    if (success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', error || 'Failed to create plan');
    }
  };

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Create a Plan</Text>

        <View style={styles.typeSelector}>
          {PLAN_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.value}
              style={[styles.typeButton, type === pt.value && styles.typeButtonActive]}
              onPress={() => {
                setType(pt.value);
                setPlaces([]);
                setMovies([]);
              }}
            >
              <Text style={styles.typeIcon}>{pt.icon}</Text>
              <Text style={[styles.typeLabel, type === pt.value && styles.typeLabelActive]}>{pt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder={`E.g., ${type === 'meal' ? 'Dinner at Luigi\'s' : type === 'movie' ? 'Watch Inception' : 'Weekend Trip'}`}
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: Colors.textPrimary }}>{date.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Time (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 19:00 or 7:00 PM"
            placeholderTextColor={Colors.textTertiary}
            value={time}
            onChangeText={setTime}
          />
        </View>

        {/* Dynamic Fields */}
        {type === 'meal' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Restaurant Search</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Search restaurant..."
                  placeholderTextColor={Colors.textTertiary}
                  value={locationStr}
                  onChangeText={setLocationStr}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPlaces}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>
              {searching && <ActivityIndicator style={{ marginTop: 8 }} />}
              {places.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.resultItem}
                  onPress={() => setLocationStr(`${place.name}, ${place.address}`)}
                >
                  <Text style={styles.resultTitle}>{place.name}</Text>
                  <Text style={styles.resultSub}>{place.address}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Head Count (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 4"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={headCount}
                onChangeText={setHeadCount}
              />
            </View>
          </>
        )}

        {type === 'movie' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Movie Search</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Search movie..."
                  placeholderTextColor={Colors.textTertiary}
                  value={movieQuery}
                  onChangeText={setMovieQuery}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearchMovies}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>
              {searching && <ActivityIndicator style={{ marginTop: 8 }} />}
              {movies.map((movie) => (
                <TouchableOpacity
                  key={movie.id}
                  style={styles.resultItem}
                  onPress={() => {
                    setMovieQuery(movie.title);
                    setTitle(`Watch ${movie.title}`);
                  }}
                >
                  <Text style={styles.resultTitle}>{movie.title}</Text>
                  <Text style={styles.resultSub}>Released: {movie.releaseDate}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Booking URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., https://bookmyshow.com/..."
                placeholderTextColor={Colors.textTertiary}
                value={bookingUrl}
                onChangeText={setBookingUrl}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {type === 'trip' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="Where to?"
                placeholderTextColor={Colors.textTertiary}
                value={locationStr}
                onChangeText={setLocationStr}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Dates</Text>
              <TextInput
                style={styles.input}
                placeholder="Departure Date (e.g., 10 Oct)"
                placeholderTextColor={Colors.textTertiary}
                value={departureDate}
                onChangeText={setDepartureDate}
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Return Date (e.g., 15 Oct)"
                placeholderTextColor={Colors.textTertiary}
                value={returnDate}
                onChangeText={setReturnDate}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Budget per Person (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
          </>
        )}

        {type === 'custom' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Central Park"
              placeholderTextColor={Colors.textTertiary}
              value={locationStr}
              onChangeText={setLocationStr}
            />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Any extra details..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.submitBtnText}>Create Plan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  typeLabelActive: { color: Colors.surface },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  searchRow: { flexDirection: 'row', alignItems: 'stretch' },
  searchBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  searchBtnText: { color: Colors.surface, fontWeight: '600' },
  resultItem: {
    backgroundColor: Colors.surfaceAlt,
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  resultTitle: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
  resultSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { fontSize: 18, color: Colors.surface, fontWeight: '700' },
});
