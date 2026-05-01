import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Routes } from '../../constants/routes';

/**
 * Progress Indicator Dots
 */
const ProgressDots: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
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

/**
 * Validate name: letters, spaces, hyphens only
 */
const isValidName = (name: string): boolean => /^[a-zA-Z\s\-]*$/.test(name);

/**
 * DisplayNameScreen - Step 1 of 3 onboarding
 */
export default function DisplayNameScreen({ navigation }: any) {
  const [displayName, setDisplayName] = useState('');
  const setDisplayNameToStore = useAuthStore((state) => state.setDisplayName);

  const handleDisplayNameChange = (text: string) => {
    if (!isValidName(text)) return;
    setDisplayName(text);
  };

  const handleContinue = () => {
    if (displayName.trim().length < 2) return;
    setDisplayNameToStore(displayName.trim());
    const setLastCompletedStep = useAuthStore((state) => state.setLastCompletedStep);
    setLastCompletedStep('displayName');
    navigation.navigate(Routes.AVATAR);
  };

  const isValid = displayName.trim().length >= 2;
  const charCount = displayName.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.surface }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}
      >
        {/* Progress Indicator */}
        <View style={{ marginTop: 32, marginBottom: 40 }}>
          <ProgressDots current={1} total={4} />
        </View>

        {/* Heading */}
        <Text
          style={{
            fontSize: Typography.fontSize.xxxl,
            fontWeight: Typography.fontWeight.bold,
            color: Colors.textPrimary,
            marginBottom: 12,
          }}
        >
          What should we call you?
        </Text>

        {/* Subtext */}
        <Text
          style={{
            fontSize: Typography.fontSize.md,
            color: Colors.textSecondary,
            marginBottom: 32,
            lineHeight: Typography.lineHeight.normal * Typography.fontSize.md,
          }}
        >
          This is how you'll appear in circles. You can change it later.
        </Text>

        {/* Display Name Input */}
        <View style={{ marginBottom: 12 }}>
          <TextInput
            placeholder="Your first name"
            placeholderTextColor={Colors.textTertiary}
            value={displayName}
            onChangeText={handleDisplayNameChange}
            maxLength={30}
            style={{
              fontSize: Typography.fontSize.xxl,
              fontWeight: Typography.fontWeight.semibold,
              color: Colors.textPrimary,
              borderBottomWidth: 2,
              borderBottomColor: Colors.border,
              paddingVertical: 12,
              paddingHorizontal: 0,
            }}
            autoCapitalize="words"
          />
        </View>

        {/* Character Count */}
        <Text
          style={{
            fontSize: Typography.fontSize.sm,
            color: Colors.textTertiary,
            marginBottom: 40,
            textAlign: 'right',
          }}
        >
          {charCount}/30
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isValid}
          style={{
            backgroundColor: isValid ? Colors.accent : Colors.textTertiary,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 16,
            opacity: isValid ? 1 : 0.5,
          }}
        >
          <Text
            style={{
              fontSize: Typography.fontSize.md,
              fontWeight: Typography.fontWeight.semibold,
              color: Colors.surface,
            }}
          >
            Continue →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
