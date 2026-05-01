import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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
  onSnapshot,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { CategoryFilter } from '../../components/feed/CategoryFilter';
import { TransitSearchBar } from '../../components/feed/TransitSearchBar';
import { FeedCard } from '../../components/feed/FeedCard';
import { ScreenLayout } from '../../components/shared/ScreenLayout';
import { useOfflineSync } from '../../hooks/useOffline';
import { useLocation } from '../../hooks/useLocation';
import { sortCirclesByRelevance, getUserPreferences } from '../../services/feedRelevance.service';
import { trackTransitSearch } from '../../services/analytics.service';
import type { OpenCircle, CircleCategory, UserPreferences } from '../../types/feed.types';

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

  const [circles, setCircles] = useState<OpenCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<CircleCategory | 'all'>('all');
  const [selectedCity, setSelectedCity] = useState<string>('Near me 📍');
  const [showTransitSearch, setShowTransitSearch] = useState(false);
  const [transitFilter, setTransitFilter] = useState<{ route: string; date: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'members' | 'active'>('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // User preferences for relevance algorithm
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  
  // Location for proximity scoring
  const { location, permissionGranted } = useLocation();

  useEffect(() => {
    loadCircles();
    loadUserPreferences();
  }, [selectedCategory, transitFilter]);

  // Update city display when location changes
  useEffect(() => {
    if (location?.city) {
      setSelectedCity(`${location.city} 📍`);
    }
  }, [location]);

  // Set up offline sync
  useOfflineSync(() => {
    console.log('Back online, refreshing feed...');
    onRefresh();
  });

  const loadUserPreferences = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const prefs = await getUserPreferences(userId);
      setUserPreferences(prefs);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

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

      // Pagination
      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const fetchedCircles: OpenCircle[] = [];

      snapshot.forEach((doc) => {
        fetchedCircles.push({ id: doc.id, ...doc.data() } as OpenCircle);
      });

      // Apply relevance algorithm sorting
      let sortedCircles = fetchedCircles;
      
      // Apply keyword search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        sortedCircles = sortedCircles.filter(circle => 
          circle.name.toLowerCase().includes(query) ||
          circle.pitch.toLowerCase().includes(query) ||
          circle.tags.some(tag => tag.toLowerCase().includes(query)) ||
          circle.location?.toLowerCase().includes(query)
        );
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'relevance':
          // Only apply relevance sorting if NOT using manual filters
          if (!transitFilter && selectedCategory === 'all' && !searchQuery.trim()) {
            sortedCircles = sortCirclesByRelevance(
              sortedCircles,
              location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
              userPreferences || undefined
            );
            console.log('Applied relevance algorithm sorting');
          } else {
            console.log('Using manual filter, skipping relevance sorting');
          }
          break;
        case 'newest':
          sortedCircles = sortedCircles.sort((a, b) => b.createdAt - a.createdAt);
          break;
        case 'members':
          sortedCircles = sortedCircles.sort((a, b) => b.memberCount - a.memberCount);
          break;
        case 'active':
          // Sort by join velocity (trending circles)
          sortedCircles = sortedCircles.sort((a, b) => 
            (b.joinVelocity || 0) - (a.joinVelocity || 0)
          );
          break;
      }

      if (loadMore) {
        setCircles((prev) => [...prev, ...sortedCircles]);
      } else {
        setCircles(sortedCircles);
        // Save to cache
        await saveToCache(sortedCircles);
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

  const handleTransitSearch = async (route: string, date: string) => {
    setTransitFilter({ route, date });
    setShowTransitSearch(false);
    
    // Track transit search for travel context scoring
    await trackTransitSearch(route, date);
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No circles found nearby</Text>
      <Text style={styles.emptySubtitle}>Be the first to post one</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreateOpenCircleScreen')}
      >
        <Text style={styles.emptyButtonText}>Post a Card</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFeedCard = ({ item }: { item: OpenCircle }) => (
    <FeedCard
      circle={item}
      onJoin={() => {
        navigation.navigate('OpenCircleDetailScreen', { circleId: item.id });
      }}
      onReport={() => {
        // Refresh the feed after report
        onRefresh();
      }}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowTransitSearch(true)}
          >
            <Text style={styles.headerButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search circles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Menu */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          <TouchableOpacity
            style={[styles.sortOption, sortBy === 'relevance' && styles.sortOptionActive]}
            onPress={() => { setSortBy('relevance'); setShowSortMenu(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'relevance' && styles.sortOptionTextActive]}>
              ✨ Relevance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortOption, sortBy === 'newest' && styles.sortOptionActive]}
            onPress={() => { setSortBy('newest'); setShowSortMenu(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'newest' && styles.sortOptionTextActive]}>
              🕐 Newest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortOption, sortBy === 'members' && styles.sortOptionActive]}
            onPress={() => { setSortBy('members'); setShowSortMenu(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'members' && styles.sortOptionTextActive]}>
              👥 Most Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortOption, sortBy === 'active' && styles.sortOptionActive]}
            onPress={() => { setSortBy('active'); setShowSortMenu(false); }}
          >
            <Text style={[styles.sortOptionText, sortBy === 'active' && styles.sortOptionTextActive]}>
              🔥 Most Active
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
        <TouchableOpacity style={styles.locationButton}>
          <Text style={styles.locationText}>{selectedCity}</Text>
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {loading ? (
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
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of FeedCard
            offset: 200 * index,
            index,
          })}
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

      {/* Transit Search Bar */}
      <TransitSearchBar
        visible={showTransitSearch}
        onSearch={handleTransitSearch}
        onCancel={handleCancelTransitSearch}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    color: Colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },
  clearButton: {
    fontSize: 20,
    color: Colors.textSecondary,
    paddingHorizontal: 8,
  },
  sortMenu: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  sortOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sortOptionTextActive: {
    fontWeight: '700',
    color: Colors.primary,
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
    color: Colors.textSecondary,
    fontWeight: '500',
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

export default FeedScreen;
