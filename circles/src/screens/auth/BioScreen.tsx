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
 * BioScreen - Step 3 of 3 onboarding (optional)
 */
export default function BioScreen({ navigation }: any) {
  const [bio, setBio] = useState('');
  const setBioToStore = useAuthStore((state) => state.setBio);

  const handleBioChange = (text: string) => {
    if (text.length <= 80) {
      setBio(text);
    }
  };

  const handleContinue = () => {
    setBioToStore(bio);
    const setLastCompletedStep = useAuthStore((state) => state.setLastCompletedStep);
    setLastCompletedStep('bio');
    navigation.navigate(Routes.INTENT);
  };

  const handleSkip = () => {
    setBioToStore('');
    const setLastCompletedStep = useAuthStore((state) => state.setLastCompletedStep);
    setLastCompletedStep('bio');
    navigation.navigate(Routes.INTENT);
  };

  const charCount = bio.length;

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
          <ProgressDots current={3} total={4} />
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
          Tell people about you
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
          Optional. Max 80 characters. Only visible to your circle members.
        </Text>

        {/* Bio Input */}
        <View style={{ marginBottom: 8 }}>
          <TextInput
            placeholder="e.g. Musician in Bengaluru | coffee addict | up for anything"
            placeholderTextColor={Colors.textTertiary}
            value={bio}
            onChangeText={handleBioChange}
            maxLength={80}
            multiline={true}
            numberOfLines={2}
            style={{
              fontSize: Typography.fontSize.md,
              color: Colors.textPrimary,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
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
          {charCount}/80
        </Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          style={{
            backgroundColor: Colors.accent,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 12,
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

        {/* Skip Link */}
        <TouchableOpacity onPress={handleSkip} style={{ paddingVertical: 12 }}>
          <Text
            style={{
              fontSize: Typography.fontSize.md,
              color: Colors.primary,
              textAlign: 'center',
              fontWeight: Typography.fontWeight.semibold,
            }}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
