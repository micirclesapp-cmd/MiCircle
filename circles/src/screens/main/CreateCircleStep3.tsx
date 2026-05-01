import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { doc, setDoc, collection, getDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../../services/firebase';
import { generateUniqueInviteToken } from '../../utils/inviteToken';
import { uploadCirclePhotoToFirebase } from '../../utils/circlePhotoUploadUtils';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { PrivateCircle } from '../../types/circle.types';

interface CreateCircleStep3Props {
  circleData: {
    type: 'friends' | 'family' | 'office' | 'custom';
    name: string;
    tagline: string;
    photoUrl?: string;
  };
  onBack: () => void;
  onSuccess: (circleId: string) => void;
}

const PHOTO_PRESETS = [
  { id: 'preset-1', bgColor: '#8B4513', icon: '⛰️' },
  { id: 'preset-2', bgColor: '#87CEEB', icon: '🏖️' },
  { id: 'preset-3', bgColor: '#2ECC71', icon: '🌲' },
  { id: 'preset-4', bgColor: '#34495E', icon: '🏙️' },
  { id: 'preset-5', bgColor: '#0F1419', icon: '🌌' },
  { id: 'preset-6', bgColor: '#FF69B4', icon: '🌸' },
  { id: 'preset-7', bgColor: '#1E90FF', icon: '🌊' },
  { id: 'preset-8', bgColor: '#DAA520', icon: '🏜️' },
  { id: 'preset-9', bgColor: '#00CED1', icon: '🌌' },
  { id: 'preset-10', bgColor: '#FF6347', icon: '🌅' },
  { id: 'preset-11', bgColor: '#F0F8FF', icon: '❄️' },
  { id: 'preset-12', bgColor: '#32CD32', icon: '🌴' },
];

/**
 * CreateCircleStep3 - Review and create circle
 * 
 * This is the final step that:
 * 1. Shows a review of circle details
 * 2. Checks free tier limit (max 1 active circle)
 * 3. Generates unique invite token with collision detection
 * 4. Writes to Firestore
 */
export default function CreateCircleStep3({
  circleData,
  onBack,
  onSuccess,
}: CreateCircleStep3Props) {
  const [loading, setLoading] = useState(false);

  const getPresetColor = (presetId?: string) => {
    if (!presetId) return Colors.primary;
    const preset = PHOTO_PRESETS.find((p) => p.id === presetId);
    return preset?.bgColor || Colors.primary;
  };

  const getPresetIcon = (presetId?: string) => {
    if (!presetId) return '👥';
    const preset = PHOTO_PRESETS.find((p) => p.id === presetId);
    return preset?.icon || '👥';
  };

  /**
   * Check if user has reached free tier circle limit
   * Free users: max 1 active circle
   * Circles+ users: unlimited
   */
  const checkFreeTierLimit = async (uid: string): Promise<boolean> => {
    try {
      // Get user subscription
      const userDocRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        return true; // Allow creation if user not found
      }

      const subscription = userSnap.data()?.subscription || 'free';
      
      // Circles+ users have unlimited circles
      if (subscription === 'circles+' || subscription === 'premium') {
        return true; // No limit
      }

      // Free users: check if they already have 1 circle
      const circlesRef = collection(firestore, 'circles');
      const q = query(
        circlesRef,
        where('createdBy', '==', uid),
        where('isArchived', '==', false)
      );
      const snapshot = await getDocs(q);
      
      // If they have 0 circles, allow creation
      // If they have 1 or more, block
      return snapshot.size === 0;
    } catch (error) {
      console.error('Error checking free tier limit:', error);
      // On error, allow creation (don't block due to temporary issues)
      return true;
    }
  };

  const handleCreateCircle = async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Check free tier limit
      const canCreate = await checkFreeTierLimit(currentUser.uid);
      if (!canCreate) {
        Alert.alert(
          'Limit Reached',
          'Free users can create up to 1 circle. Upgrade to Circles+ for unlimited circles.',
          [
            {
              text: 'Upgrade',
              onPress: () => {
                // Navigate to upgrade screen in future
              },
            },
            {
              text: 'Cancel',
              onPress: () => setLoading(false),
            },
          ]
        );
        return;
      }

      // Get user info from Firestore
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.error('User profile not found for uid:', currentUser.uid);
        Alert.alert(
          'Error',
          'User profile not found. Please complete your profile setup first.'
        );
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      // Validate user data
      if (!userData.displayName) {
        console.error('User displayName missing');
        Alert.alert(
          'Error',
          'Please complete your profile setup before creating a circle.'
        );
        setLoading(false);
        return;
      }

      // Generate unique invite token (with collision detection)
      const inviteToken = await generateUniqueInviteToken();

      // Create circle document
      const now = Date.now();
      const circleId = doc(collection(firestore, 'circles')).id;

      const circleDoc: PrivateCircle = {
        id: circleId,
        name: circleData.name,
        tagline: circleData.tagline,
        type: circleData.type,
        photoUrl: circleData.photoUrl || 'preset-1',
        creatorUid: currentUser.uid,
        members: [
          {
            uid: currentUser.uid,
            displayName: userData.displayName || 'Unknown',
            avatarUrl: userData.avatarUrl || '',
            role: 'admin',
            joinedAt: now,
          },
        ],
        inviteToken,
        createdAt: now,
        isArchived: false,
        lastMessageAt: now,
        lastMessagePreview: `${userData.displayName || 'Admin'} created this circle`,
      };

      // Write to Firestore
      console.log('Creating circle:', circleId);
      await setDoc(doc(firestore, 'circles', circleId), circleDoc);
      console.log('Circle created successfully');

      setLoading(false);
      onSuccess(circleId);
    } catch (error: any) {
      console.error('Error creating circle:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to create circle. Please try again.';
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your Firestore security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };
    try {
      setLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Get user info from Firestore
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.error('User profile not found for uid:', currentUser.uid);
        Alert.alert(
          'Error',
          'User profile not found. Please complete your profile setup first.'
        );
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      // Validate user data
      if (!userData.displayName) {
        console.error('User displayName missing');
        Alert.alert(
          'Error',
          'Please complete your profile setup before creating a circle.'
        );
        setLoading(false);
        return;
      }

      // Generate invite token
      const inviteToken = generateInviteToken();

      // Create circle document
      const now = Date.now();
      const circleId = doc(collection(firestore, 'circles')).id;

      const circleDoc: PrivateCircle = {
        id: circleId,
        name: circleData.name,
        tagline: circleData.tagline,
        type: circleData.type,
        photoUrl: circleData.photoUrl,
        creatorUid: currentUser.uid,
        members: [
          {
            uid: currentUser.uid,
            displayName: userData.displayName || 'Unknown',
            avatarUrl: userData.avatarUrl || '',
            role: 'admin',
            joinedAt: now,
          },
        ],
        inviteToken,
        createdAt: now,
        isArchived: false,
        lastMessageAt: now,
        lastMessagePreview: `${userData.displayName || 'Admin'} created this circle`,
      };

      // Write to Firestore
      console.log('Creating circle:', circleId);
      await setDoc(doc(firestore, 'circles', circleId), circleDoc);
      console.log('Circle created successfully');

      setLoading(false);
      onSuccess(circleId);
    } catch (error: any) {
      console.error('Error creating circle:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to create circle. Please try again.';
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your Firestore security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      >
        {/* Review Summary */}
        <Text
          style={{
            fontSize: Typography.fontSize.lg,
            fontWeight: Typography.fontWeight.semibold,
            color: Colors.textPrimary,
            marginBottom: 24,
          }}
        >
          Review your circle
        </Text>

        {/* Summary Card */}
        <View
          style={{
            backgroundColor: Colors.surfaceAlt,
            borderRadius: 12,
            padding: 20,
            marginBottom: 32,
            alignItems: 'center',
          }}
        >
          {/* Circle Photo Preview */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: getPresetColor(circleData.photoUrl),
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 48 }}>
              {getPresetIcon(circleData.photoUrl)}
            </Text>
          </View>

          {/* Circle Name */}
          <Text
            style={{
              fontSize: Typography.fontSize.lg,
              fontWeight: Typography.fontWeight.bold,
              color: Colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {circleData.name}
          </Text>

          {/* Circle Type */}
          <Text
            style={{
              fontSize: Typography.fontSize.sm,
              color: Colors.textSecondary,
              marginBottom: 12,
              textTransform: 'capitalize',
            }}
          >
            {circleData.type}
          </Text>

          {/* Tagline */}
          {circleData.tagline && (
            <Text
              style={{
                fontSize: Typography.fontSize.md,
                color: Colors.textSecondary,
                textAlign: 'center',
                lineHeight: Typography.lineHeight.normal * Typography.fontSize.md,
              }}
            >
              {circleData.tagline}
            </Text>
          )}
        </View>

        {/* Details List */}
        <View style={{ marginBottom: 40 }}>
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: Colors.textSecondary }}>Type</Text>
            <Text
              style={{
                color: Colors.textPrimary,
                fontWeight: Typography.fontWeight.semibold,
                textTransform: 'capitalize',
              }}
            >
              {circleData.type}
            </Text>
          </View>

          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: Colors.textSecondary }}>Invite Mode</Text>
            <Text
              style={{
                color: Colors.textPrimary,
                fontWeight: Typography.fontWeight.semibold,
              }}
            >
              Invite-only
            </Text>
          </View>

          <View
            style={{
              paddingVertical: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: Colors.textSecondary }}>Members</Text>
            <Text
              style={{
                color: Colors.textPrimary,
                fontWeight: Typography.fontWeight.semibold,
              }}
            >
              1 (you)
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: Typography.fontSize.sm,
            color: Colors.textTertiary,
            textAlign: 'center',
            lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
          }}
        >
          You can add members and change settings after creating the circle.
        </Text>
      </ScrollView>

      {/* Footer with buttons */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* Back Link */}
        <TouchableOpacity
          onPress={onBack}
          disabled={loading}
          style={{
            paddingVertical: 12,
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: Typography.fontSize.md,
              color: loading ? Colors.textTertiary : Colors.primary,
              fontWeight: Typography.fontWeight.semibold,
            }}
          >
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Create Button */}
        <TouchableOpacity
          onPress={handleCreateCircle}
          disabled={loading}
          style={{
            backgroundColor: loading ? Colors.textTertiary : Colors.primary,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: Typography.fontSize.md,
              fontWeight: Typography.fontWeight.semibold,
              color: Colors.surface,
            }}
          >
            {loading ? 'Creating...' : 'Create Circle'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
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
    </>
  );
}
