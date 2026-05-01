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
import { CircleType } from '../../types/circle.types';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface CreateCircleStep1Props {
  onNext: (data: {
    type: CircleType;
    name: string;
    tagline: string;
  }) => void;
  initialData?: {
    type: CircleType;
    name: string;
    tagline: string;
  };
}

const CIRCLE_TYPES: Array<{
  id: CircleType;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'friends',
    label: 'Friends',
    icon: '👯',
    description: 'Close friends',
  },
  {
    id: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧‍👦',
    description: 'Family members',
  },
  {
    id: 'office',
    label: 'Office',
    icon: '💼',
    description: 'Colleagues & team',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '✨',
    description: 'Any group',
  },
];

/**
 * CreateCircleStep1 - Circle type, name, and tagline
 */
export default function CreateCircleStep1({
  onNext,
  initialData,
}: CreateCircleStep1Props) {
  const [selectedType, setSelectedType] = useState<CircleType>(
    initialData?.type || 'friends'
  );
  const [name, setName] = useState(initialData?.name || '');
  const [tagline, setTagline] = useState(initialData?.tagline || '');

  const isValidName = name.trim().length >= 2 && name.trim().length <= 40;
  const canContinue = isValidName;

  const handleNameChange = (text: string) => {
    if (text.length <= 40) {
      setName(text);
    }
  };

  const handleTaglineChange = (text: string) => {
    if (text.length <= 80) {
      setTagline(text);
    }
  };

  const handleNext = () => {
    if (canContinue) {
      onNext({
        type: selectedType,
        name: name.trim(),
        tagline: tagline.trim(),
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      >
        {/* Circle Type Section */}
        <Text
          style={{
            fontSize: Typography.fontSize.lg,
            fontWeight: Typography.fontWeight.semibold,
            color: Colors.textPrimary,
            marginBottom: 12,
          }}
        >
          What type of circle?
        </Text>

        <View style={{ marginBottom: 32 }}>
          {CIRCLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setSelectedType(type.id)}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor:
                  selectedType === type.id ? Colors.primary : Colors.border,
                backgroundColor:
                  selectedType === type.id ? Colors.primaryLight : Colors.surface,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 28, marginRight: 12 }}>{type.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: Typography.fontSize.md,
                    fontWeight: Typography.fontWeight.semibold,
                    color: Colors.textPrimary,
                  }}
                >
                  {type.label}
                </Text>
                <Text
                  style={{
                    fontSize: Typography.fontSize.sm,
                    color: Colors.textSecondary,
                  }}
                >
                  {type.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Circle Name */}
        <Text
          style={{
            fontSize: Typography.fontSize.lg,
            fontWeight: Typography.fontWeight.semibold,
            color: Colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Circle Name *
        </Text>

        <TextInput
          placeholder="e.g. College Friends, Sunday Brunch Crew"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={handleNameChange}
          maxLength={40}
          style={{
            fontSize: Typography.fontSize.md,
            color: Colors.textPrimary,
            borderWidth: 1,
            borderColor: isValidName ? Colors.border : Colors.error,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 8,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: Typography.fontSize.xs,
              color: Colors.textTertiary,
            }}
          >
            {isValidName ? '✓' : '2-40 characters'}
          </Text>
          <Text
            style={{
              fontSize: Typography.fontSize.xs,
              color: Colors.textTertiary,
            }}
          >
            {name.length}/40
          </Text>
        </View>

        {/* Circle Tagline */}
        <Text
          style={{
            fontSize: Typography.fontSize.lg,
            fontWeight: Typography.fontWeight.semibold,
            color: Colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Tagline (Optional)
        </Text>

        <TextInput
          placeholder="e.g. Planning our next trip | Fitness & Coffee"
          placeholderTextColor={Colors.textTertiary}
          value={tagline}
          onChangeText={handleTaglineChange}
          maxLength={80}
          style={{
            fontSize: Typography.fontSize.md,
            color: Colors.textPrimary,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 8,
          }}
        />

        <Text
          style={{
            fontSize: Typography.fontSize.xs,
            color: Colors.textTertiary,
            textAlign: 'right',
            marginBottom: 40,
          }}
        >
          {tagline.length}/80
        </Text>
      </ScrollView>

      {/* Next Button */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canContinue}
          style={{
            backgroundColor: canContinue ? Colors.accent : Colors.textTertiary,
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
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
