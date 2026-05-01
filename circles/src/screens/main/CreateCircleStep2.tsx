import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface PhotoPreset {
  id: string;
  label: string;
  icon: string;
  bgColor: string;
}

const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'preset-1',
    label: 'Mountain',
    icon: '⛰️',
    bgColor: '#8B4513',
  },
  {
    id: 'preset-2',
    label: 'Beach',
    icon: '🏖️',
    bgColor: '#87CEEB',
  },
  {
    id: 'preset-3',
    label: 'Forest',
    icon: '🌲',
    bgColor: '#2ECC71',
  },
  {
    id: 'preset-4',
    label: 'City',
    icon: '🏙️',
    bgColor: '#34495E',
  },
  {
    id: 'preset-5',
    label: 'Night Sky',
    icon: '🌌',
    bgColor: '#0F1419',
  },
  {
    id: 'preset-6',
    label: 'Garden',
    icon: '🌸',
    bgColor: '#FF69B4',
  },
  {
    id: 'preset-7',
    label: 'Ocean',
    icon: '🌊',
    bgColor: '#1E90FF',
  },
  {
    id: 'preset-8',
    label: 'Desert',
    icon: '🏜️',
    bgColor: '#DAA520',
  },
  {
    id: 'preset-9',
    label: 'Aurora',
    icon: '🌌',
    bgColor: '#00CED1',
  },
  {
    id: 'preset-10',
    label: 'Sunset',
    icon: '🌅',
    bgColor: '#FF6347',
  },
  {
    id: 'preset-11',
    label: 'Snowy',
    icon: '❄️',
    bgColor: '#F0F8FF',
  },
  {
    id: 'preset-12',
    label: 'Tropical',
    icon: '🌴',
    bgColor: '#32CD32',
  },
];

interface CreateCircleStep2Props {
  onNext: (photoUrl?: string) => void;
  onBack: () => void;
}

/**
 * CreateCircleStep2 - Circle photo selection
 */
export default function CreateCircleStep2({
  onNext,
  onBack,
}: CreateCircleStep2Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleTakePhoto = () => {
    Alert.alert(
      'Take Photo',
      'Camera functionality would open here',
      [{ text: 'OK' }]
    );
  };

  const handleChooseFromLibrary = () => {
    Alert.alert(
      'Choose from Library',
      'Image picker would open here',
      [{ text: 'OK' }]
    );
  };

  const handleNext = () => {
    onNext(selectedPreset || undefined);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      >
        {/* Large Photo Preview */}
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: selectedPreset
                ? PHOTO_PRESETS.find((p) => p.id === selectedPreset)?.bgColor ||
                  Colors.primary
                : Colors.surfaceAlt,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 60 }}>
              {selectedPreset
                ? PHOTO_PRESETS.find((p) => p.id === selectedPreset)?.icon
                : '📷'}
            </Text>
          </View>
        </View>

        {/* Photo Options */}
        <Text
          style={{
            fontSize: Typography.fontSize.lg,
            fontWeight: Typography.fontWeight.semibold,
            color: Colors.textPrimary,
            marginBottom: 16,
          }}
        >
          Upload a photo
        </Text>

        {/* Take Photo Button */}
        <TouchableOpacity
          onPress={handleTakePhoto}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 20, marginRight: 12 }}>📷</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.fontSize.md,
                fontWeight: Typography.fontWeight.semibold,
                color: Colors.textPrimary,
              }}
            >
              Take a photo
            </Text>
            <Text
              style={{
                fontSize: Typography.fontSize.sm,
                color: Colors.textSecondary,
              }}
            >
              Use your camera
            </Text>
          </View>
        </TouchableOpacity>

        {/* Choose from Library Button */}
        <TouchableOpacity
          onPress={handleChooseFromLibrary}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 32,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 20, marginRight: 12 }}>🖼️</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.fontSize.md,
                fontWeight: Typography.fontWeight.semibold,
                color: Colors.textPrimary,
              }}
            >
              Choose from library
            </Text>
            <Text
              style={{
                fontSize: Typography.fontSize.sm,
                color: Colors.textSecondary,
              }}
            >
              Pick an existing image
            </Text>
          </View>
        </TouchableOpacity>

        {/* Preset Photos */}
        <Text
          style={{
            fontSize: Typography.fontSize.lg,
            fontWeight: Typography.fontWeight.semibold,
            color: Colors.textPrimary,
            marginBottom: 16,
          }}
        >
          Or choose a style
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            marginBottom: 40,
          }}
        >
          {PHOTO_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              onPress={() => setSelectedPreset(preset.id)}
              style={{
                width: '30%',
                aspectRatio: 1,
                borderRadius: 12,
                backgroundColor: preset.bgColor,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
                borderWidth: selectedPreset === preset.id ? 3 : 0,
                borderColor: Colors.primary,
              }}
            >
              <Text style={{ fontSize: 40 }}>{preset.icon}</Text>
              {selectedPreset === preset.id && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -6,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: Colors.success,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: Colors.surface,
                      fontSize: 14,
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer with navigation buttons */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* Back Link */}
        <TouchableOpacity
          onPress={onBack}
          style={{
            paddingVertical: 12,
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: Typography.fontSize.md,
              color: Colors.primary,
              fontWeight: Typography.fontWeight.semibold,
            }}
          >
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Next Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={{
            backgroundColor: Colors.accent,
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
    </View>
  );
}
