import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  ref,
  onValue,
  push,
  get,
  set,
} from 'firebase/database';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, firestore, realtimeDb } from '../../services/firebase';
import { useCirclesStore } from '../../store/circles.store';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Message } from '../../types/message.types';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import GifPicker from './GifPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOffline, useOfflineSync } from '../../hooks/useOffline';
import {
  addToQueue,
  flushQueue,
  getQueue,
  type QueuedMessage,
} from '../../services/messageQueue.service';
import { ScreenLayout } from '../../components/shared/ScreenLayout';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface CircleChatScreenProps {
  route: {
    params: {
      circleId: string;
      circleName: string;
    };
  };
  navigation: any;
}

/**
 * EmojiReactionPicker - Long press reaction menu
 */
const EmojiReactionPicker: React.FC<{
  visible: boolean;
  onSelect: (emoji: string) => void;
  onMorePress?: () => void;
  onDismiss: () => void;
}> = ({ visible, onSelect, onMorePress, onDismiss }) => {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: Colors.surface,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 8,
            alignItems: 'center',
          }}
        >
          {EMOJI_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                onSelect(emoji);
                onDismiss();
              }}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ width: 1, height: 24, backgroundColor: Colors.border }} />

          <TouchableOpacity onPress={onMorePress} style={{ padding: 8 }}>
            <Text style={{ fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * CircleChatScreen - Real-time group messaging
 */
export default function CircleChatScreen({
  route,
  navigation,
}: CircleChatScreenProps) {
  const { circleId, circleName } = route.params;
  const currentUid = auth.currentUser?.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] =
    useState<Message | null>(null);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<QueuedMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const { isOnline } = useOffline();

  // Set header title
  useEffect(() => {
    navigation.setOptions({ title: circleName });
  }, [circleName, navigation]);

  // Load pending messages
  useEffect(() => {
    const loadPendingMessages = async () => {
      const queue = await getQueue(circleId);
      setPendingMessages(queue.filter((msg) => msg.status === 'pending'));
    };

    loadPendingMessages();
  }, [circleId]);

  // Flush queue when back online
  useOfflineSync(async () => {
    console.log('Back online, flushing message queue...');
    await flushQueue(circleId);
    
    // Reload pending messages
    const queue = await getQueue(circleId);
    setPendingMessages(queue.filter((msg) => msg.status === 'pending'));
  });

  // Set up real-time listener
  useEffect(() => {
    if (!currentUid || !circleId) return;

    // Try to load from cache first
    const loadFromCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(`messages_${circleId}`);
        if (cached) {
          const cachedMessages = JSON.parse(cached);
          setMessages(cachedMessages);
        }
      } catch (error) {
        console.error('Cache load error:', error);
      }
    };

    loadFromCache();

    // Subscribe to real-time updates
    const messagesRef = ref(realtimeDb, `circles/${circleId}/messages`);
    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        const data = snapshot.val();
        const messageList: Message[] = [];

        if (data) {
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            messageList.push({
              id: key,
              ...value,
            });
          });
        }

        // Sort by createdAt ascending (oldest first, so newest appears at bottom in inverted list)
        messageList.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(messageList);
        setLoading(false);

        // Cache the messages
        AsyncStorage.setItem(`messages_${circleId}`, JSON.stringify(messageList)).catch(
          (error) => console.error('Cache save error:', error)
        );
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [circleId, currentUid]);

  const handleSendMessage = async (text: string) => {
    if (!currentUid) return;

    try {
      // Get current user data from Firestore
      const userDocSnap = await getDoc(doc(firestore, 'users', currentUid));
      const userData = userDocSnap.data();
      const senderName = userData?.displayName || 'Unknown';

      if (!isOnline) {
        // Add to queue when offline
        const queuedMessage = await addToQueue(
          circleId,
          text,
          currentUid,
          senderName
        );

        // Update pending messages list
        setPendingMessages((prev) => [...prev, queuedMessage]);

        // Show message in local list with pending indicator
        const pendingMessage: Message = {
          id: queuedMessage.id,
          circleId,
          senderUid: currentUid,
          senderName,
          senderAvatar: userData?.avatarUrl || '',
          text,
          reactions: {},
          createdAt: queuedMessage.createdAt,
          deletedForAll: false,
          isSystem: false,
          isPending: true, // Custom flag for UI
        };

        setMessages((prev) => [...prev, pendingMessage]);
        setReplyingTo(null);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        console.log('Message queued for offline sending');
        return;
      }

      // Send immediately when online
      const now = Date.now();
      const messagesRef = ref(realtimeDb, `circles/${circleId}/messages`);

      const newMessage: Message = {
        id: '', // Will be assigned by push
        circleId,
        senderUid: currentUid,
        senderName,
        senderAvatar: userData?.avatarUrl || '',
        text,
        reactions: {},
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              text: replyingTo.text || '',
              senderName: replyingTo.senderName,
            }
          : undefined,
        createdAt: now,
        deletedForAll: false,
        isSystem: false,
      };

      // Push to Realtime DB
      await push(messagesRef, newMessage);

      // Update Firestore circle document
      const circleRef = doc(firestore, 'circles', circleId);
      await updateDoc(circleRef, {
        lastMessageAt: now,
        lastMessagePreview: text.substring(0, 50),
        lastSenderName: senderName,
      });

      setReplyingTo(null);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleAddReaction = async (emoji: string) => {
    if (!currentUid || !selectedMessageForReaction) return;

    try {
      const reactionRef = ref(
        realtimeDb,
        `circles/${circleId}/messages/${selectedMessageForReaction.id}/reactions/${emoji}`
      );

      // Get existing reactions
      const snapshot = await get(reactionRef);
      const existingReactions = snapshot.val() || [];

      // Add user ID if not already there
      if (!existingReactions.includes(currentUid)) {
        existingReactions.push(currentUid);
        // Update in DB - Firebase will handle the update
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }

    setShowReactionPicker(false);
    setSelectedMessageForReaction(null);
  };

  const handleGifSelect = (gifUrl: string) => {
    // Send GIF as a special message
    handleSendMessage(`[GIF] ${gifUrl}`);
    // TODO: Parse and store as gifUrl field instead of text
    setGifPickerVisible(false);
  };

  if (loading && messages.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScreenLayout>
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderUid === currentUid}
            circleId={circleId}
            onLongPress={() => {
              setSelectedMessageForReaction(item);
              setShowReactionPicker(true);
            }}
            onReply={() => setReplyingTo(item)}
          />
        )}
        inverted={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {}}
            colors={[Colors.primary]}
          />
        }
      />

      {/* Emoji Reaction Picker */}
      <EmojiReactionPicker
        visible={showReactionPicker}
        onSelect={handleAddReaction}
        onDismiss={() => {
          setShowReactionPicker(false);
          setSelectedMessageForReaction(null);
        }}
      />

      {/* Chat Input */}
      <ChatInput
        circleId={circleId}
        onSend={handleSendMessage}
        onGifPress={() => setGifPickerVisible(true)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* GIF Picker Modal */}
      <Modal
        visible={gifPickerVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setGifPickerVisible(false)}
      >
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setGifPickerVisible(false)}
        />
      </Modal>
    </ScreenLayout>
  );
}
