import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { PlanCard } from '../../components/plan/PlanCard';
import { ScreenLayout } from '../../components/shared/ScreenLayout';
import { useOfflineSync } from '../../hooks/useOffline';
import type { Plan } from '../../types/plan.types';

type CircleStackParamList = {
  CirclePlannerScreen: { circleId: string };
  CreatePlanScreen: { circleId: string };
  PlanDetailScreen: { circleId: string; planId: string };
  AvailabilityCheckScreen: { circleId: string; mode: 'create' };
};

type CirclePlannerScreenNavigationProp = StackNavigationProp<
  CircleStackParamList,
  'CirclePlannerScreen'
>;

type CirclePlannerScreenRouteProp = RouteProp<
  CircleStackParamList,
  'CirclePlannerScreen'
>;

export default function CirclePlannerScreen() {
  const navigation = useNavigation<CirclePlannerScreenNavigationProp>();
  const route = useRoute<CirclePlannerScreenRouteProp>();
  const { circleId } = route.params;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserUid = auth.currentUser?.uid || '';

  // Set up offline sync
  useOfflineSync(() => {
    console.log('Back online, refreshing plans...');
    onRefresh();
  });

  useEffect(() => {
    if (!circleId) return;

    // Load from cache first
    loadFromCache();

    // Query plans for this circle
    const plansRef = collection(firestore, 'circles', circleId, 'plans');
    const q = query(
      plansRef,
      where('isArchived', '==', false),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPlans: Plan[] = [];
        snapshot.forEach((doc) => {
          fetchedPlans.push({ id: doc.id, ...doc.data() } as Plan);
        });
        setPlans(fetchedPlans);
        // Save to cache
        saveToCache(fetchedPlans);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching plans:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [circleId]);

  const loadFromCache = async () => {
    try {
      const cacheKey = `plans_${circleId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const cachedPlans = JSON.parse(cached);
        setPlans(cachedPlans);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading plans from cache:', error);
    }
  };

  const saveToCache = async (data: Plan[]) => {
    try {
      const cacheKey = `plans_${circleId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving plans to cache:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically update the data
  };

  // Separate plans into upcoming and past
  const now = new Date();
  const upcomingPlans = plans.filter((plan) => new Date(plan.date) >= now);
  const pastPlans = plans.filter((plan) => new Date(plan.date) < now);

  const handlePlanPress = (planId: string) => {
    navigation.navigate('PlanDetailScreen', { circleId, planId });
  };

  const handleCreatePlan = () => {
    navigation.navigate('CreatePlanScreen', { circleId });
  };

  const renderPlanCard = ({ item }: { item: Plan }) => (
    <PlanCard
      plan={item}
      currentUserUid={currentUserUid}
      onPress={() => handlePlanPress(item.id)}
    />
  );

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {/* Top Action Bar */}
            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('AvailabilityCheckScreen', { circleId, mode: 'create' })}
              >
                <Text style={styles.actionButtonText}>📅 Check Availability</Text>
              </TouchableOpacity>
            </View>

            {/* Upcoming Plans Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcomingPlans.length === 0 ? (
                renderEmptyState('No upcoming plans')
              ) : (
                <FlatList
                  data={upcomingPlans}
                  renderItem={renderPlanCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>

            {/* Past Plans Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past</Text>
              {pastPlans.length === 0 ? (
                renderEmptyState('No past plans')
              ) : (
                <FlatList
                  data={pastPlans}
                  renderItem={renderPlanCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePlan}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  topActions: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.surface,
    fontWeight: '300',
  },
});
