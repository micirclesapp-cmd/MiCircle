import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Text,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Message } from '../types/message.types';
import {
  subscribeToMessages,
  getLastMessages,
  markMessageAsSeen,
} from '../services/messageService';
import {
  loadCachedMessages,
  cacheMessages,
  mergeCachedMessages,
} from '../services/messageCache.service';
import { useMessagesStore } from '../store/messages.store';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { useCirclesStore } from '../store/circles.store';
import { EmojiPickerModal } from './EmojiPickerModal';
import { useAuth } from '../store/auth.store';

interface ChatScreenProps {
  circleId: string;
  route?: any;
  navigation?: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  circleId,
  route,
  navigation,
}) => {
  const authStore = useAuth();
  const circlesStore = useCirclesStore();
  const messagesStore = useMessagesStore();

  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const circle = circlesStore.getCircleById(circleId);
  const messages = messagesStore.getCircleMessages(circleId);
  const isLoadingMessages = messagesStore.isLoading(circleId);

  const currentUserId = authStore.user?.uid || '';
  const currentUserName = authStore.user?.displayName || 'Unknown';
  const currentUserAvatar = authStore.user?.avatarUrl || '';

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, [circleId]);

  // Set up real-time listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unsubscribe = subscribeToMessages(
          circleId,
          (newMessages) => {
            // Merge with cache
            mergeCachedMessages(circleId, newMessages).then((merged) => {
              messagesStore.setMessages(circleId, merged);
              // Update circle with last message
              if (merged.length > 0) {
                const lastMessage = merged[0];
                circlesStore.updateCircle(circleId, {
                  lastMessageAt: lastMessage.createdAt,
                  lastMessagePreview: lastMessage.text || '[GIF]',
                });
              }
            });
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to messages:', error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up listener:', error);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [circleId]);

  // Mark messages as seen
  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      messages.forEach((msg) => {
        if (msg.senderUid !== currentUserId && !msg.seenBy?.[currentUserId]) {
          markMessageAsSeen(circleId, msg.id, currentUserId).catch((err) =>
            console.error('Error marking message as seen:', err)
          );
        }
      });
      // Clear unread count
      messagesStore.clearUnreadCount(circleId);
    }
  }, [messages, circleId, currentUserId]);

  const loadMessages = async () => {
    try {
      setLoading(true);

      // Try to load from cache first
      const cached = await loadCachedMessages(circleId);
      if (cached) {
        messagesStore.setMessages(circleId, cached);
      }

      // Load latest from Firebase
      const latest = await getLastMessages(circleId, 100);
      if (latest) {
        const merged = await mergeCachedMessages(circleId, latest);
        messagesStore.setMessages(circleId, merged);
        await cacheMessages(circleId, merged);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      messagesStore.setError(circleId, 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMessages();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh messages');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMessageSent = (messageId: string) => {
    // Message will appear via real-time listener
    // Just scroll to top
    console.log('Message sent:', messageId);
  };

  const handleReactionLongPress = (message: Message) => {
    setSelectedMessageForReaction(message);
    setReactionPickerVisible(true);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage
      message={item}
      circleId={circleId}
      currentUserId={currentUserId}
      onReply={() => setReplyTo(item)}
      onReactionLongPress={handleReactionLongPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Start a conversation with your circle members</Text>
    </View>
  );

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Messages List */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* Message Composer */}
      <ChatComposer
        circleId={circleId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onMessageSent={handleMessageSent}
        replyTo={replyTo}
        onReplyCleared={() => setReplyTo(null)}
      />

      {/* Reaction Picker */}
      {selectedMessageForReaction && (
        <EmojiPickerModal
          visible={reactionPickerVisible}
          onEmojiSelected={(emoji) => {
            // Reaction is handled in ChatMessage component
            setReactionPickerVisible(false);
            setSelectedMessageForReaction(null);
          }}
          onClose={() => {
            setReactionPickerVisible(false);
            setSelectedMessageForReaction(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
