import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import {
  searchGifs,
  getTrendingGifs,
  getRecentSearches,
  Gif,
} from '../services/gifService';

interface GifPickerModalProps {
  visible: boolean;
  onGifSelected: (gif: Gif) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_WIDTH = (SCREEN_WIDTH - 24) / 2; // 2 columns with padding

export const GifPickerModal: React.FC<GifPickerModalProps> = ({
  visible,
  onGifSelected,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrending, setShowTrending] = useState(true);

  // Load data when modal opens
  React.useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load recent searches
      const recent = await getRecentSearches();
      setRecentSearches(recent);

      // Load trending GIFs
      const trending = await getTrendingGifs(20);
      setGifs(trending);
      setShowTrending(true);
    } catch (err) {
      console.error('Error loading GIF data:', err);
      setError('Failed to load GIFs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        // Show trending when search is cleared
        try {
          setLoading(true);
          const trending = await getTrendingGifs(20);
          setGifs(trending);
          setShowTrending(true);
        } catch (err) {
          setError('Failed to load trending GIFs');
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setShowTrending(false);

        const results = await searchGifs(query, 30);
        setGifs(results);

        if (results.length === 0) {
          setError('No GIFs found for this search');
        }
      } catch (err) {
        console.error('Error searching GIFs:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to search GIFs. Please try again.'
        );
        setGifs([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search
  const debounceTimer = React.useRef<NodeJS.Timeout>();

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      handleSearch(query);
    }, 500);
  };

  const handleGifSelect = (gif: Gif) => {
    onGifSelected(gif);
    setSearchQuery('');
    onClose();
  };

  const renderGifItem = ({ item }: { item: Gif }) => (
    <TouchableOpacity
      style={styles.gifContainer}
      onPress={() => handleGifSelect(item)}
    >
      <Image
        source={{ uri: item.thumbUrl }}
        style={styles.gifImage}
        resizeMode="cover"
      />
      <Text style={styles.gifTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentSearch = (query: string) => (
    <TouchableOpacity
      key={query}
      style={styles.recentSearchButton}
      onPress={() => {
        setSearchQuery(query);
        handleSearch(query);
      }}
    >
      <Text style={styles.recentSearchText}>🔍 {query}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search GIFs..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
          />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Searches (when not searching) */}
        {!searchQuery && recentSearches.length > 0 && !loading && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <View style={styles.recentSearchesList}>
              {recentSearches.slice(0, 5).map(renderRecentSearch)}
            </View>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading GIFs...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleSearch(searchQuery)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GIFs Grid */}
        {gifs.length > 0 && !loading && !error && (
          <FlatList
            data={gifs}
            renderItem={renderGifItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContainer}
            scrollEnabled={true}
          />
        )}

        {/* Empty State */}
        {gifs.length === 0 && !loading && !error && !showTrending && (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        )}

        {/* Trending Label */}
        {showTrending && gifs.length > 0 && (
          <Text style={styles.trendingLabel}>Trending Now</Text>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  recentSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recentSearchesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  recentSearchText: {
    fontSize: 13,
    color: '#333',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gifContainer: {
    width: GIF_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  gifImage: {
    width: '100%',
    height: GIF_WIDTH,
  },
  gifTitle: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#d9534f',
    textAlign: 'center',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
  },
  trendingLabel: {
    position: 'absolute',
    top: 60,
    left: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
});
