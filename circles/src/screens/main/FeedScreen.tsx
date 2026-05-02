import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { CategoryFilter } from '../../components/feed/CategoryFilter';
import { TransitSearchBar } from '../../components/feed/TransitSearchBar';
import { FeedCard } from '../../components/feed/FeedCard';
import { ScreenLayout } from '../../components/shared/ScreenLayout';
import { TransitRow } from '../../components/feed/TransitRow';
import { useOfflineSync } from '../../hooks/useOffline';
import { useLocation } from '../../hooks/useLocation';
import type { OpenCircle, CircleCategory } from '../../types/feed.types';

const FEED_CACHE_KEY = 'feed_cache';

type FeedStackParamList = {
  FeedScreen: undefined;
  CreateOpenCircleScreen: undefined;
  OpenCircleDetailScreen: { circleId: string };
};

type FeedScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'FeedScreen'>;

const SKELETON_COUNT = 3;
const PAGE_SIZE = 20;

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const { city: gpsCity, loading: locationLoading } = useLocation();

  const [circles, setCircles] = useState<OpenCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<CircleCategory | 'all'>('all');
  
  // Location
  const [selectedCity, setSelectedCity] = useState<string>('Near me 📍');
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [manualCityInput, setManualCityInput] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransitSearch, setShowTransitSearch] = useState(false);
  const [transitFilter, setTransitFilter] = useState<{ route: string; date: string } | null>(null);

  // Update selected city when GPS finds it
  useEffect(() => {
    if (gpsCity && gpsCity !== 'Near me 📍' && selectedCity === 'Near me 📍') {
      setSelectedCity(gpsCity);
    }
  }, [gpsCity]);

  // Load circles on dependency changes
  useEffect(() => {
    // If we're waiting for the first GPS location to resolve, wait a bit
    if (locationLoading && selectedCity === 'Near me 📍') return;
    loadCircles();
  }, [selectedCategory, transitFilter, selectedCity, searchQuery, locationLoading]);

  // Set up offline sync
  useOfflineSync(() => {
    console.log('Back online, refreshing feed...');
    onRefresh();
  });

  const loadCircles = async (loadMore = false) => {
    if (loadMore && !hasMore) return;

    try {
      if (!loadMore) {
        // Load from cache first
        const cached = await loadFromCache();
        if (cached && cached.length > 0) {
          setCircles(cached);
          setLoading(false);
        }
        
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const circlesRef = collection(firestore, 'public_circles');
      let q = query(
        circlesRef,
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      // Apply category filter
      if (selectedCategory !== 'all') {
        q = query(
          circlesRef,
          where('isArchived', '==', false),
          where('category', '==', selectedCategory),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      // Apply transit filter
      if (transitFilter) {
        q = query(
          circlesRef,
          where('isArchived', '==', false),
          where('transitRoute', '==', transitFilter.route),
          where('transitDate', '==', transitFilter.date),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      // Apply city filter if not 'Near me'
      const cleanCity = selectedCity.replace(' 📍', '').trim();
      if (cleanCity && cleanCity !== 'Near me' && cleanCity !== 'Unknown Location') {
        // Since we can only have one inequality or array-contains, we filter equality on city
        // Note: Firestore requires composite indexes for multiple where clauses.
        // We assume city is an exact match for V1.
        q = query(
          circlesRef,
          where('isArchived', '==', false),
          where('city', '==', cleanCity),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      // Pagination
      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      let fetchedCircles: OpenCircle[] = [];

      snapshot.forEach((doc) => {
        fetchedCircles.push({ id: doc.id, ...doc.data() } as OpenCircle);
      });

      // Apply client-side text search filter
      if (searchQuery.trim().length > 0) {
        const queryLower = searchQuery.toLowerCase();
        fetchedCircles = fetchedCircles.filter(
          c => c.name.toLowerCase().includes(queryLower) || 
               (c.pitch && c.pitch.toLowerCase().includes(queryLower))
        );
      }

      if (loadMore) {
        setCircles((prev) => {
          // Remove duplicates
          const newCircles = [...prev, ...fetchedCircles];
          const uniqueCircles = Array.from(new Map(newCircles.map(c => [c.id, c])).values());
          return uniqueCircles;
        });
      } else {
        setCircles(fetchedCircles);
        await saveToCache(fetchedCircles);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading circles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadFromCache = async (): Promise<OpenCircle[]> => {
    try {
      const cached = await AsyncStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return [];
  };

  const saveToCache = async (data: OpenCircle[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setLastDoc(null);
    setHasMore(true);
    loadCircles();
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadCircles(true);
    }
  };

  const handleTransitSearch = (route: string, date: string) => {
    setTransitFilter({ route, date });
    setShowTransitSearch(false);
  };

  const handleCancelTransitSearch = () => {
    setShowTransitSearch(false);
    setTransitFilter(null);
  };

  const renderSkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTag} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonText} />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No circles found nearby</Text>
        <Text style={styles.emptySubtitle}>Be the first to post a circle here</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('CreateOpenCircleScreen')}
        >
          <Text style={styles.emptyButtonText}>Create Circle</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFeedCard = ({ item }: { item: OpenCircle }) => (
    <FeedCard
      circle={item}
      onJoin={() => {
        navigation.navigate('OpenCircleDetailScreen', { circleId: item.id });
      }}
      onReport={() => {
        onRefresh();
      }}
    />
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      );
    }
    
    // "You've seen everything" text when feed is exhausted
    if (!hasMore && circles.length > 0) {
      return (
        <View style={styles.footerTextContainer}>
          <Text style={styles.footerText}>You've seen everything. Check back soon!</Text>
        </View>
      );
    }
    
    return null;
  };

  const renderLocationModal = () => (
    <Modal visible={isLocationModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Where are you?</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter a city name"
            value={manualCityInput}
            onChangeText={setManualCityInput}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalCancelButton} 
              onPress={() => setIsLocationModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalSaveButton}
              onPress={() => {
                if (manualCityInput.trim()) {
                  setSelectedCity(`${manualCityInput.trim()} 📍`);
                  setLastDoc(null);
                  setHasMore(true);
                }
                setIsLocationModalVisible(false);
              }}
            >
              <Text style={styles.modalSaveText}>Search Area</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity
            style={styles.transitIcon}
            onPress={() => setShowTransitSearch(true)}
          >
            <Text style={styles.transitIconText}>🚂</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search circles by name or pitch..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setLastDoc(null);
              setHasMore(true);
            }}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setLastDoc(null);
            setHasMore(true);
          }}
        />

        {/* Location Selector */}
        <View style={styles.locationBar}>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => {
              setManualCityInput(selectedCity.replace(' 📍', ''));
              setIsLocationModalVisible(true);
            }}
          >
            <Text style={styles.locationText}>{selectedCity}</Text>
          </TouchableOpacity>
        </View>

        {/* Transit Row (Today's trains near you) */}
        <TransitRow userCity={selectedCity} />

        {/* Feed List */}
        {loading && circles.length === 0 ? (
          <View style={styles.skeletonContainer}>
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <View key={index}>{renderSkeletonCard()}</View>
            ))}
          </View>
        ) : (
          <FlatList
            data={circles}
            renderItem={renderFeedCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyState}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateOpenCircleScreen')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        {/* Transit Search Bar Modal */}
        <TransitSearchBar
          visible={showTransitSearch}
          onSearch={handleTransitSearch}
          onCancel={handleCancelTransitSearch}
        />

        {/* Location Override Modal */}
        {renderLocationModal()}
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  transitIcon: {
    padding: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
  },
  transitIconText: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  locationBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  skeletonContainer: {
    paddingTop: 16,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  skeletonTag: {
    width: 80,
    height: 24,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonTitle: {
    width: '70%',
    height: 20,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonText: {
    width: '100%',
    height: 16,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerTextContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: Colors.textPrimary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: Colors.surfaceAlt,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
});

export default FeedScreen;
