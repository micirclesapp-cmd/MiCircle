import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../../services/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Routes } from '../../constants/routes';

interface IntentCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const IntentCard: React.FC<IntentCardProps> = ({
  icon,
  title,
  subtitle,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      paddingVertical: 24,
      paddingHorizontal: 16,
      marginBottom: 16,
      alignItems: 'center',
    }}
  >
    <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
    <Text
      style={{
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
      }}
    >
      {title}
    </Text>
    <Text
      style={{
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
      }}
    >
      {subtitle}
    </Text>
  </TouchableOpacity>
);

const PRESET_AVATARS = [
  { id: 'person-blue' },
  { id: 'star-yellow' },
  { id: 'leaf-green' },
  { id: 'sun-orange' },
  { id: 'moon-purple' },
  { id: 'wave-teal' },
  { id: 'mountain-brown' },
  { id: 'spark-pink' },
];

/**
 * IntentScreen - Final step of onboarding
 * - User chooses their primary intent
 * - Writes complete user doc to Firestore (NO phoneNumber)
 * - Routes to MainTabNavigator with appropriate default tab
 */
export default function IntentScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const displayName = useAuthStore((state) => state.displayName);
  const avatarUrl = useAuthStore((state) => state.avatarUrl);
  const bio = useAuthStore((state) => state.bio);
  const setUserIntent = useAuthStore((state) => state.setUserIntent);
  const reset = useAuthStore((state) => state.reset);

  /**
   * Create user document in Firestore with complete onboarding data
   * CRITICAL: Phone number is NOT included (stored only in Firebase Auth)
   */
  const createUserDocument = async (intent: 'circles' | 'feed' | 'both') => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;

      if (!uid) {
        throw new Error('No authenticated user');
      }

      const now = Date.now();

      // Write user document to Firestore with all onboarding fields
      // NO phoneNumber field — it stays only in Firebase Auth
      await setDoc(doc(firestore, 'users', uid), {
        // User identity (from Google Sign-In)
        uid,
        displayName: displayName || 'User',
        avatarUrl: avatarUrl || `preset:${PRESET_AVATARS[0].id}`,
        bio: bio || '',
        joinedVia: 'google',

        // Onboarding
        userIntent: intent,
        onboardingCompleted: true,
        joinYear: new Date().getFullYear(),

        // Session tracking (for 30-min sensitive action timeout)
        sessionTimestamp: now,
        lastAuthTime: now,

        // App management
        subscription: 'free',
        createdAt: now,
        updatedAt: now,
      });

      // Clear temporary onboarding data from store
      reset();

      // Navigate to MainTabNavigator with appropriate default tab
      if (intent === 'circles') {
        navigation.replace(Routes.CIRCLES_TAB);
      } else {
        // Both and Feed intent default to Feed tab
        navigation.replace(Routes.FEED_TAB);
      }
    } catch (error) {
      console.error('Error creating user document:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWithPeople = () => {
    setUserIntent('circles');
    createUserDocument('circles');
  };

  const handleMeetNewPeople = () => {
    setUserIntent('feed');
    createUserDocument('feed');
  };

  const handleBoth = () => {
    setUserIntent('both');
    createUserDocument('both');
  };

  // Progress Indicator Dots
  const ProgressDots: React.FC<{ current: number; total: number }> = ({
    current,
    total,
  }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
      {[...Array(total)].map((_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i < current ? Colors.primary : Colors.border,
          }}
        />
      ))}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        paddingHorizontal: 16,
      }}
    >
      {/* Progress Indicator */}
      <ProgressDots current={4} total={4} />

      {/* Heading */}
      <Text
        style={{
          fontSize: Typography.fontSize.xxxl,
          fontWeight: Typography.fontWeight.bold,
          color: Colors.textPrimary,
          marginBottom: 40,
          textAlign: 'center',
          lineHeight: Typography.lineHeight.tight * Typography.fontSize.xxxl,
        }}
      >
        What brings you to Circles?
      </Text>

      {/* Intent Cards */}
      <IntentCard
        icon="🫂"
        title="Connect with my people"
        subtitle="Chat and plan with friends, family, and colleagues"
        onPress={handleConnectWithPeople}
      />

      <IntentCard
        icon="🔍"
        title="Meet new people"
        subtitle="Find co-passengers, hobby partners, and neighbours"
        onPress={handleMeetNewPeople}
      />

      <IntentCard
        icon="✨"
        title="Both"
        subtitle="I want it all — private groups and open discovery"
        onPress={handleBoth}
      />

      {/* Loading Overlay */}
      {loading && (
        <Modal transparent={true} animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color={Colors.surface} />
          </View>
        </Modal>
      )}
    </View>
  );
}
