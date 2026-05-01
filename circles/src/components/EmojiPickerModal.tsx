import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  getEmojiCategories,
  getEmojisByCategory,
  searchEmojis,
  getRecentlyUsedEmojis,
  addRecentlyUsedEmoji,
  Emoji,
  EmojiCategory,
  getSkinToneVariants,
} from '../services/emojiService';

interface EmojiPickerModalProps {
  visible: boolean;
  onEmojiSelected: (emoji: string) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EMOJI_SIZE = 50;
const COLUMNS = Math.floor(SCREEN_WIDTH / EMOJI_SIZE);

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({
  visible,
  onEmojiSelected,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EmojiCategory>('smileys');
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [skinToneMenuOpen, setSkinToneMenuOpen] = useState(false);
  const [selectedEmojiForTones, setSelectedEmojiForTones] = useState<Emoji | null>(null);
  const [loading, setLoading] = useState(false);

  // Load recently used emojis when modal opens
  React.useEffect(() => {
    if (visible) {
      loadRecentlyUsed();
    }
  }, [visible]);

  const loadRecentlyUsed = async () => {
    try {
      const recent = await getRecentlyUsedEmojis();
      setRecentlyUsed(recent);
    } catch (error) {
      console.error('Error loading recently used emojis:', error);
    }
  };

  const categories = useMemo(() => {
    const allCategories = getEmojiCategories();
    return allCategories.sort();
  }, []);

  const displayEmojis = useMemo(() => {
    if (searchQuery) {
      // Show search results
      return searchEmojis(searchQuery);
    }

    if (selectedCategory === 'recently' && recentlyUsed.length > 0) {
      // Show recently used - need to map strings to Emoji objects
      return recentlyUsed.map((emoji) => ({
        emoji,
        name: emoji,
        category: 'smileys' as EmojiCategory,
      }));
    }

    // Show emojis from selected category
    return getEmojisByCategory(selectedCategory);
  }, [searchQuery, selectedCategory, recentlyUsed]);

  const handleEmojiSelect = useCallback(
    async (emoji: Emoji) => {
      // Check if emoji has skin tone support
      if (emoji.skinTones && !searchQuery) {
        setSelectedEmojiForTones(emoji);
        setSkinToneMenuOpen(true);
        return;
      }

      // Add to recently used
      await addRecentlyUsedEmoji(emoji.emoji);

      // Report selection
      onEmojiSelected(emoji.emoji);

      // Reset and close
      setSearchQuery('');
      onClose();
    },
    [searchQuery, onEmojiSelected, onClose]
  );

  const handleSkinToneSelect = useCallback(
    async (toneEmoji: string) => {
      // Add to recently used
      await addRecentlyUsedEmoji(toneEmoji);

      // Report selection
      onEmojiSelected(toneEmoji);

      // Reset and close
      setSkinToneMenuOpen(false);
      setSelectedEmojiForTones(null);
      setSearchQuery('');
      onClose();
    },
    [onEmojiSelected, onClose]
  );

  const renderEmojiButton = ({ item }: { item: Emoji }) => (
    <TouchableOpacity
      style={styles.emojiButton}
      onPress={() => handleEmojiSelect(item)}
    >
      <Text style={styles.emojiText}>{item.emoji}</Text>
    </TouchableOpacity>
  );

  const renderCategoryTab = (category: EmojiCategory) => {
    const isRecent = category === 'recently' && recentlyUsed.length > 0;
    const isSelected = selectedCategory === category;

    if (!isRecent && category === 'recently') {
      return null;
    }

    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryTab,
          isSelected && styles.categoryTabActive,
        ]}
        onPress={() => {
          setSelectedCategory(category);
          setSearchQuery('');
        }}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
          {category === 'recently' ? '🕐' : getCategoryIcon(category)}
        </Text>
      </TouchableOpacity>
    );
  };

  const skinToneVariants = selectedEmojiForTones
    ? getSkinToneVariants(selectedEmojiForTones.emoji)
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search emojis..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        {!searchQuery && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContainer}
          >
            {recentlyUsed.length > 0 && renderCategoryTab('recently')}
            {categories.map((cat) => renderCategoryTab(cat as EmojiCategory))}
          </ScrollView>
        )}

        {/* Emoji Grid */}
        {displayEmojis.length > 0 ? (
          <FlatList
            data={displayEmojis}
            renderItem={renderEmojiButton}
            keyExtractor={(item, index) => `${item.emoji}-${index}`}
            numColumns={COLUMNS}
            contentContainerStyle={styles.emojiGrid}
            scrollEnabled={true}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No emojis found</Text>
          </View>
        )}

        {/* Skin Tone Picker Modal */}
        {skinToneMenuOpen && selectedEmojiForTones && (
          <View style={styles.skinToneOverlay}>
            <TouchableOpacity
              style={styles.skinToneBackground}
              onPress={() => {
                setSkinToneMenuOpen(false);
                setSelectedEmojiForTones(null);
              }}
            />
            <View style={styles.skinToneMenu}>
              <View style={styles.skinToneContent}>
                <TouchableOpacity
                  style={styles.skinToneButton}
                  onPress={() => handleSkinToneSelect(selectedEmojiForTones.emoji)}
                >
                  <Text style={styles.skinToneEmoji}>
                    {selectedEmojiForTones.emoji}
                  </Text>
                  <Text style={styles.skinToneName}>Default</Text>
                </TouchableOpacity>

                {skinToneVariants.map((variant) => (
                  <TouchableOpacity
                    key={variant.emoji}
                    style={styles.skinToneButton}
                    onPress={() => handleSkinToneSelect(variant.emoji)}
                  >
                    <Text style={styles.skinToneEmoji}>{variant.emoji}</Text>
                    <Text style={styles.skinToneName}>
                      {variant.name.split(' - ')[1]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// Helper function to get category icon
const getCategoryIcon = (category: EmojiCategory): string => {
  const icons: Record<EmojiCategory, string> = {
    smileys: '😀',
    people: '👋',
    animals: '🐶',
    food: '🍔',
    travel: '✈️',
    activities: '⚽',
    objects: '💡',
    symbols: '❤️',
    flags: '🚩',
  };

  return icons[category] || '😀';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  categoriesScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoriesContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryTabActive: {
    backgroundColor: '#e0e0e0',
  },
  categoryText: {
    fontSize: 18,
  },
  categoryTextActive: {
    opacity: 1,
  },
  emojiGrid: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emojiButton: {
    width: `${100 / COLUMNS}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  emojiText: {
    fontSize: 36,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  skinToneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skinToneBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  skinToneMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  skinToneContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  skinToneButton: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  skinToneEmoji: {
    fontSize: 32,
  },
  skinToneName: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
});
