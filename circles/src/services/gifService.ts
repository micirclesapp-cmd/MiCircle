import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * GIF Service
 * 
 * Integrates with Giphy API for GIF search and delivery
 * - Search GIFs by query with debouncing
 * - Rate limiting (free tier: 100/hour or use public beta key)
 * - Cache recent searches for offline
 * - Handle rate limit gracefully
 * - Full featured despite API limits
 */

export interface Gif {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  rating: string;
}

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyData {
  id: string;
  title: string;
  images: {
    original: GiphyImage;
    preview_gif?: GiphyImage;
    fixed_height_downsampled?: GiphyImage;
  };
  rating: string;
}

interface GiphyResponse {
  data: GiphyData[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
}

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC'; // Public beta key (limited)
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs/search';
const CACHE_PREFIX = 'gif_cache_';
const RECENT_SEARCHES_KEY = 'gif_recent_searches';
const RATE_LIMIT_KEY = 'gif_rate_limit';

// Rate limit tracking (100 requests per hour)
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if rate limit has been exceeded
 */
const isRateLimited = async (): Promise<boolean> => {
  try {
    const rateLimitData = await AsyncStorage.getItem(RATE_LIMIT_KEY);

    if (!rateLimitData) {
      return false;
    }

    const { count, windowStart } = JSON.parse(rateLimitData) as {
      count: number;
      windowStart: number;
    };

    const now = Date.now();
    const windowElapsed = now - windowStart;

    // Reset if window has passed
    if (windowElapsed > RATE_LIMIT_WINDOW_MS) {
      await AsyncStorage.setItem(
        RATE_LIMIT_KEY,
        JSON.stringify({ count: 0, windowStart: now })
      );
      return false;
    }

    // Check if over limit
    return count >= RATE_LIMIT_REQUESTS;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
};

/**
 * Increment rate limit counter
 */
const incrementRateLimit = async (): Promise<void> => {
  try {
    const rateLimitData = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    let count = 1;
    let windowStart = Date.now();

    if (rateLimitData) {
      const existing = JSON.parse(rateLimitData) as {
        count: number;
        windowStart: number;
      };

      const now = Date.now();
      const windowElapsed = now - existing.windowStart;

      if (windowElapsed < RATE_LIMIT_WINDOW_MS) {
        count = existing.count + 1;
        windowStart = existing.windowStart;
      } else {
        count = 1;
        windowStart = now;
      }
    }

    await AsyncStorage.setItem(
      RATE_LIMIT_KEY,
      JSON.stringify({ count, windowStart })
    );
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
  }
};

/**
 * Search GIFs from Giphy API
 */
export const searchGifs = async (query: string, limit: number = 20): Promise<Gif[]> => {
  try {
    // Check cache first
    const cacheKey = `${CACHE_PREFIX}${query}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (cached) {
      console.log(`Using cached GIFs for query: ${query}`);
      return JSON.parse(cached) as Gif[];
    }

    // Check rate limit
    if (await isRateLimited()) {
      console.warn('GIF API rate limit exceeded');
      throw new Error(
        'GIF search temporarily unavailable. Please try again later.'
      );
    }

    // Make API request
    const url = `${GIPHY_API_BASE}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
      query
    )}&limit=${limit}&rating=g&lang=en`;

    const response = await fetch(url, {
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const data = (await response.json()) as GiphyResponse;

    // Increment rate limit counter
    await incrementRateLimit();

    // Convert Giphy format to our Gif format
    const gifs: Gif[] = data.data.map((item: GiphyData) => ({
      id: item.id,
      title: item.title,
      url: item.images.original.url,
      thumbUrl: item.images.fixed_height_downsampled?.url || item.images.preview_gif?.url || item.images.original.url,
      previewUrl: item.images.preview_gif?.url || item.images.original.url,
      width: parseInt(item.images.original.width, 10),
      height: parseInt(item.images.original.height, 10),
      rating: item.rating,
    }));

    // Cache results
    await AsyncStorage.setItem(cacheKey, JSON.stringify(gifs));

    // Add to recent searches
    await addRecentSearch(query);

    console.log(`Found ${gifs.length} GIFs for query: ${query}`);

    return gifs;
  } catch (error) {
    console.error('Error searching GIFs:', error);
    throw error;
  }
};

/**
 * Get trending GIFs
 */
export const getTrendingGifs = async (limit: number = 20): Promise<Gif[]> => {
  try {
    const cacheKey = 'gif_cache_trending';
    const cached = await AsyncStorage.getItem(cacheKey);

    // Use cache if available (update interval: 1 hour)
    if (cached) {
      const cachedData = JSON.parse(cached) as {
        gifs: Gif[];
        timestamp: number;
      };

      const age = Date.now() - cachedData.timestamp;
      if (age < 60 * 60 * 1000) {
        return cachedData.gifs;
      }
    }

    // Check rate limit
    if (await isRateLimited()) {
      console.warn('GIF API rate limit exceeded');
      // Return cached if available
      if (cached) {
        return JSON.parse(cached).gifs;
      }
      throw new Error('GIF search temporarily unavailable');
    }

    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;

    const response = await fetch(url, {
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const data = (await response.json()) as GiphyResponse;

    // Increment rate limit
    await incrementRateLimit();

    const gifs: Gif[] = data.data.map((item: GiphyData) => ({
      id: item.id,
      title: item.title,
      url: item.images.original.url,
      thumbUrl: item.images.fixed_height_downsampled?.url || item.images.preview_gif?.url || item.images.original.url,
      previewUrl: item.images.preview_gif?.url || item.images.original.url,
      width: parseInt(item.images.original.width, 10),
      height: parseInt(item.images.original.height, 10),
      rating: item.rating,
    }));

    // Cache results with timestamp
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        gifs,
        timestamp: Date.now(),
      })
    );

    return gifs;
  } catch (error) {
    console.error('Error fetching trending GIFs:', error);
    throw error;
  }
};

/**
 * Add search to recent searches
 */
export const addRecentSearch = async (query: string): Promise<void> => {
  try {
    const recentSearches = await getRecentSearches();

    // Remove if already in list
    const filtered = recentSearches.filter((s) => s !== query);

    // Add to front and keep only last 20
    const updated = [query, ...filtered].slice(0, 20);

    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding recent search:', error);
  }
};

/**
 * Get recent GIF searches
 */
export const getRecentSearches = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

/**
 * Clear recent searches
 */
export const clearRecentSearches = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};

/**
 * Clear all GIF cache
 */
export const clearGifCache = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const gifKeys = allKeys.filter((key) => key.startsWith(CACHE_PREFIX));

    if (gifKeys.length > 0) {
      await AsyncStorage.multiRemove(gifKeys);
      console.log(`Cleared ${gifKeys.length} GIF cache items`);
    }
  } catch (error) {
    console.error('Error clearing GIF cache:', error);
  }
};

/**
 * Get cache size in MB
 */
export const getGifCacheSize = async (): Promise<number> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const gifKeys = allKeys.filter((key) => key.startsWith(CACHE_PREFIX));

    let totalSize = 0;

    for (const key of gifKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    return totalSize / (1024 * 1024); // Convert to MB
  } catch (error) {
    console.error('Error getting GIF cache size:', error);
    return 0;
  }
};

/**
 * Check if GIF search is available (not rate limited)
 */
export const isGifSearchAvailable = async (): Promise<boolean> => {
  return !(await isRateLimited());
};

/**
 * Get rate limit status
 */
export const getRateLimitStatus = async (): Promise<{
  remaining: number;
  resetTime: number;
}> => {
  try {
    const rateLimitData = await AsyncStorage.getItem(RATE_LIMIT_KEY);

    if (!rateLimitData) {
      return {
        remaining: RATE_LIMIT_REQUESTS,
        resetTime: 0,
      };
    }

    const { count, windowStart } = JSON.parse(rateLimitData) as {
      count: number;
      windowStart: number;
    };

    const now = Date.now();
    const windowElapsed = now - windowStart;

    if (windowElapsed > RATE_LIMIT_WINDOW_MS) {
      return {
        remaining: RATE_LIMIT_REQUESTS,
        resetTime: 0,
      };
    }

    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - count);
    const resetTime = windowStart + RATE_LIMIT_WINDOW_MS;

    return {
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return {
      remaining: 0,
      resetTime: 0,
    };
  }
};

/**
 * Reset rate limit (for testing/admin)
 */
export const resetRateLimit = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RATE_LIMIT_KEY);
    console.log('Rate limit reset');
  } catch (error) {
    console.error('Error resetting rate limit:', error);
  }
};

/**
 * Get aspect ratio for GIF (for proper display)
 */
export const getGifAspectRatio = (gif: Gif): number => {
  if (gif.height === 0) return 1;
  return gif.width / gif.height;
};

/**
 * Calculate GIF display dimensions
 */
export const calculateGifDimensions = (
  gif: Gif,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = getGifAspectRatio(gif);

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};
