import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types/message.types';

/**
 * Message Cache Service
 * 
 * Manages local caching of messages for offline support
 * - Last 100 messages per circle stored in AsyncStorage
 * - Load cache on app start
 * - Sync only new messages from Firebase
 * - Expire cache after 7 days
 */

const CACHE_PREFIX = 'msg_cache_';
const CACHE_METADATA_PREFIX = 'msg_cache_meta_';
const CACHE_EXPIRY_DAYS = 7;

/**
 * Get cache key for a circle
 */
const getCacheKey = (circleId: string): string => {
  return `${CACHE_PREFIX}${circleId}`;
};

/**
 * Get cache metadata key for a circle
 */
const getCacheMetadataKey = (circleId: string): string => {
  return `${CACHE_METADATA_PREFIX}${circleId}`;
};

/**
 * Cache message metadata (timestamp, size info)
 */
interface CacheMetadata {
  circleId: string;
  lastUpdated: number;
  messageCount: number;
  oldestMessageTime: number;
}

/**
 * Save messages to cache for a circle
 */
export const cacheMessages = async (
  circleId: string,
  messages: Message[]
): Promise<void> => {
  try {
    const cacheKey = getCacheKey(circleId);
    const metadataKey = getCacheMetadataKey(circleId);

    // Keep only last 100 messages
    const cachedMessages = messages.slice(0, 100);

    // Save messages
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify(cachedMessages)
    );

    // Save metadata
    const metadata: CacheMetadata = {
      circleId,
      lastUpdated: Date.now(),
      messageCount: cachedMessages.length,
      oldestMessageTime: cachedMessages[cachedMessages.length - 1]?.createdAt || 0,
    };

    await AsyncStorage.setItem(
      metadataKey,
      JSON.stringify(metadata)
    );

    console.log(
      `Cached ${cachedMessages.length} messages for circle ${circleId}`
    );
  } catch (error) {
    console.error('Error caching messages:', error);
  }
};

/**
 * Load messages from cache for a circle
 */
export const loadCachedMessages = async (
  circleId: string
): Promise<Message[] | null> => {
  try {
    const cacheKey = getCacheKey(circleId);
    const metadataKey = getCacheMetadataKey(circleId);

    // Check if cache is expired
    const metadataJson = await AsyncStorage.getItem(metadataKey);
    if (metadataJson) {
      const metadata = JSON.parse(metadataJson) as CacheMetadata;
      const cacheAgeMs = Date.now() - metadata.lastUpdated;
      const cacheAgeHours = cacheAgeMs / (1000 * 60 * 60);
      const expiryHours = CACHE_EXPIRY_DAYS * 24;

      if (cacheAgeHours > expiryHours) {
        console.log(`Cache expired for circle ${circleId}`);
        await clearCache(circleId);
        return null;
      }
    }

    // Load messages from cache
    const cachedJson = await AsyncStorage.getItem(cacheKey);
    if (cachedJson) {
      const messages = JSON.parse(cachedJson) as Message[];
      console.log(`Loaded ${messages.length} cached messages for circle ${circleId}`);
      return messages;
    }

    return null;
  } catch (error) {
    console.error('Error loading cached messages:', error);
    return null;
  }
};

/**
 * Get cache metadata for a circle
 */
export const getCacheMetadata = async (
  circleId: string
): Promise<CacheMetadata | null> => {
  try {
    const metadataKey = getCacheMetadataKey(circleId);
    const metadataJson = await AsyncStorage.getItem(metadataKey);

    if (metadataJson) {
      return JSON.parse(metadataJson) as CacheMetadata;
    }

    return null;
  } catch (error) {
    console.error('Error getting cache metadata:', error);
    return null;
  }
};

/**
 * Add a single message to cache (for real-time updates)
 */
export const addMessageToCache = async (
  circleId: string,
  message: Message
): Promise<void> => {
  try {
    const cachedMessages = await loadCachedMessages(circleId);

    if (cachedMessages) {
      // Add message and keep only 100
      const updated = [message, ...cachedMessages].slice(0, 100);
      await cacheMessages(circleId, updated);
    } else {
      // First message for this circle
      await cacheMessages(circleId, [message]);
    }
  } catch (error) {
    console.error('Error adding message to cache:', error);
  }
};

/**
 * Merge new messages from Firebase with cache
 */
export const mergeCachedMessages = async (
  circleId: string,
  newMessages: Message[]
): Promise<Message[]> => {
  try {
    const cachedMessages = await loadCachedMessages(circleId);

    if (!cachedMessages || cachedMessages.length === 0) {
      // No cache, use new messages
      await cacheMessages(circleId, newMessages);
      return newMessages;
    }

    // Merge: new messages + cached messages
    // Remove duplicates by messageId
    const messageMap = new Map<string, Message>();

    // Add cached messages first
    cachedMessages.forEach((msg) => {
      messageMap.set(msg.id, msg);
    });

    // Add/override with new messages
    newMessages.forEach((msg) => {
      messageMap.set(msg.id, msg);
    });

    // Convert back to array and sort by createdAt descending
    const merged = Array.from(messageMap.values());
    merged.sort((a, b) => b.createdAt - a.createdAt);

    // Cache the merged result (keep 100)
    await cacheMessages(circleId, merged);

    console.log(
      `Merged ${newMessages.length} new messages with ${cachedMessages.length} cached messages`
    );

    return merged;
  } catch (error) {
    console.error('Error merging cached messages:', error);
    return newMessages;
  }
};

/**
 * Clear cache for a specific circle
 */
export const clearCache = async (circleId: string): Promise<void> => {
  try {
    const cacheKey = getCacheKey(circleId);
    const metadataKey = getCacheMetadataKey(circleId);

    await AsyncStorage.removeItem(cacheKey);
    await AsyncStorage.removeItem(metadataKey);

    console.log(`Cache cleared for circle ${circleId}`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Clear all message caches
 */
export const clearAllCaches = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();

    // Get keys that match cache prefix
    const cacheKeys = allKeys.filter(
      (key) => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_METADATA_PREFIX)
    );

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} cache items`);
    }
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
};

/**
 * Get total cache size in bytes
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      (key) => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_METADATA_PREFIX)
    );

    let totalSize = 0;

    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

/**
 * Cleanup old caches (for app startup optimization)
 */
export const cleanupOldCaches = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const metadataKeys = allKeys.filter((key) =>
      key.startsWith(CACHE_METADATA_PREFIX)
    );

    const now = Date.now();
    const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    for (const metadataKey of metadataKeys) {
      const metadataJson = await AsyncStorage.getItem(metadataKey);

      if (metadataJson) {
        const metadata = JSON.parse(metadataJson) as CacheMetadata;
        const cacheAge = now - metadata.lastUpdated;

        if (cacheAge > expiryMs) {
          const circleId = metadata.circleId;
          await clearCache(circleId);
          console.log(`Cleaned up expired cache for circle ${circleId}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old caches:', error);
  }
};

/**
 * Get messages from cache that haven't been synced
 * (Helper for detecting unsynced messages during offline)
 */
export const getUnsyncedMessages = async (
  circleId: string,
  lastSyncTime: number
): Promise<Message[]> => {
  try {
    const cachedMessages = await loadCachedMessages(circleId);

    if (!cachedMessages) {
      return [];
    }

    // Get messages created after last sync that have isPending flag
    return cachedMessages.filter(
      (msg) => msg.createdAt > lastSyncTime && msg.isPending
    );
  } catch (error) {
    console.error('Error getting unsynced messages:', error);
    return [];
  }
};
