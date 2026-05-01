import {
  ref,
  push,
  set,
  update,
  get,
  query,
  orderByChild,
  limitToLast,
  onValue,
  off,
  DataSnapshot,
  Unsubscribe,
} from 'firebase/database';
import { db } from './firebase';
import { Message } from '../types/message.types';

/**
 * Message Service
 * 
 * Handles all Firebase Realtime Database operations for messages:
 * - Sending messages (text, GIFs)
 * - Reactions (add/remove emoji)
 * - Replies and threading
 * - Message deletion
 * - Real-time listeners
 * - Delivery status tracking
 */

/**
 * Send a message to a circle
 */
export const sendMessage = async (
  circleId: string,
  senderUid: string,
  senderName: string,
  senderAvatar: string,
  text?: string,
  gifUrl?: string,
  replyTo?: { id: string; text: string; senderName: string }
): Promise<string> => {
  try {
    const messagesRef = ref(db, `messages/${circleId}`);
    const newMessageRef = push(messagesRef);

    const message: Message = {
      id: newMessageRef.key || '',
      circleId,
      senderUid,
      senderName,
      senderAvatar,
      text: text || undefined,
      gifUrl: gifUrl || undefined,
      reactions: {},
      replyTo,
      createdAt: Date.now(),
      deletedForAll: false,
      isSystem: false,
    };

    await set(newMessageRef, message);

    console.log(`Message sent to circle ${circleId}: ${newMessageRef.key}`);

    return newMessageRef.key || '';
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Add an emoji reaction to a message
 */
export const addReaction = async (
  circleId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = ref(db, `messages/${circleId}/${messageId}`);
    const messageSnapshot = await get(messageRef);

    if (!messageSnapshot.exists()) {
      throw new Error('Message not found');
    }

    const message = messageSnapshot.val() as Message;
    const reactions = message.reactions || {};

    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    // Add user if not already reacted with this emoji
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    await update(messageRef, { reactions });

    console.log(`Reaction ${emoji} added to message ${messageId} by ${userId}`);
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

/**
 * Remove an emoji reaction from a message
 */
export const removeReaction = async (
  circleId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = ref(db, `messages/${circleId}/${messageId}`);
    const messageSnapshot = await get(messageRef);

    if (!messageSnapshot.exists()) {
      throw new Error('Message not found');
    }

    const message = messageSnapshot.val() as Message;
    const reactions = message.reactions || {};

    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((uid) => uid !== userId);

      // Remove empty reaction
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    await update(messageRef, { reactions });

    console.log(`Reaction ${emoji} removed from message ${messageId} by ${userId}`);
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
};

/**
 * Delete a message for the sender only
 */
export const deleteMessageForMe = async (
  circleId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = ref(db, `messages/${circleId}/${messageId}`);
    const messageSnapshot = await get(messageRef);

    if (!messageSnapshot.exists()) {
      throw new Error('Message not found');
    }

    const message = messageSnapshot.val() as Message;
    const deletedForMe = message.deletedForMe || [];

    if (!deletedForMe.includes(userId)) {
      deletedForMe.push(userId);
    }

    await update(messageRef, { deletedForMe });

    console.log(`Message ${messageId} deleted for ${userId}`);
  } catch (error) {
    console.error('Error deleting message for me:', error);
    throw error;
  }
};

/**
 * Delete a message for everyone (within 5 minutes of send)
 */
export const deleteMessageForEveryone = async (
  circleId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = ref(db, `messages/${circleId}/${messageId}`);
    const messageSnapshot = await get(messageRef);

    if (!messageSnapshot.exists()) {
      throw new Error('Message not found');
    }

    const message = messageSnapshot.val() as Message;

    // Check if message was sent by user
    if (message.senderUid !== userId) {
      throw new Error('Only sender can delete for everyone');
    }

    // Check if within 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (message.createdAt < fiveMinutesAgo) {
      throw new Error('Can only delete messages within 5 minutes');
    }

    // Mark as deleted for all
    await update(messageRef, {
      deletedForAll: true,
      text: undefined,
      gifUrl: undefined,
    });

    console.log(`Message ${messageId} deleted for everyone`);
  } catch (error) {
    console.error('Error deleting message for everyone:', error);
    throw error;
  }
};

/**
 * Edit a message (within 15 minutes of send)
 */
export const editMessage = async (
  circleId: string,
  messageId: string,
  userId: string,
  newText: string
): Promise<void> => {
  try {
    const messageRef = ref(db, `messages/${circleId}/${messageId}`);
    const messageSnapshot = await get(messageRef);

    if (!messageSnapshot.exists()) {
      throw new Error('Message not found');
    }

    const message = messageSnapshot.val() as Message;

    // Check if message was sent by user
    if (message.senderUid !== userId) {
      throw new Error('Only sender can edit message');
    }

    // Check if within 15 minutes
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    if (message.createdAt < fifteenMinutesAgo) {
      throw new Error('Can only edit messages within 15 minutes');
    }

    // Update message
    await update(messageRef, {
      text: newText,
      lastUpdated: Date.now(),
    });

    console.log(`Message ${messageId} edited`);
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};

/**
 * Subscribe to all messages in a circle (real-time listener)
 */
export const subscribeToMessages = (
  circleId: string,
  onSnapshot: (messages: Message[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const messagesRef = ref(db, `messages/${circleId}`);

    const listener = onValue(
      messagesRef,
      (snapshot: DataSnapshot) => {
        const messagesObj = snapshot.val();

        if (messagesObj) {
          const messages = Object.values(messagesObj) as Message[];
          // Sort by createdAt descending (newest first for Firebase)
          messages.sort((a, b) => b.createdAt - a.createdAt);
          onSnapshot(messages);
        } else {
          onSnapshot([]);
        }
      },
      (error) => {
        console.error('Error subscribing to messages:', error);
        if (onError) onError(error);
      }
    );

    // Return unsubscribe function
    return () => off(messagesRef, 'value', listener);
  } catch (error) {
    console.error('Error setting up message listener:', error);
    throw error;
  }
};

/**
 * Get last N messages for a circle (for pagination/history)
 */
export const getLastMessages = async (
  circleId: string,
  limit: number = 50
): Promise<Message[]> => {
  try {
    const messagesRef = ref(db, `messages/${circleId}`);
    const messagesQuery = query(
      messagesRef,
      orderByChild('createdAt'),
      limitToLast(limit)
    );

    const snapshot = await get(messagesQuery);

    if (snapshot.exists()) {
      const messagesObj = snapshot.val();
      const messages = Object.values(messagesObj) as Message[];
      // Sort by createdAt descending (newest first)
      messages.sort((a, b) => b.createdAt - a.createdAt);
      return messages;
    }

    return [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Mark message as seen by user
 */
export const markMessageAsSeen = async (
  circleId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    const seenByRef = ref(
      db,
      `messages/${circleId}/${messageId}/seenBy/${userId}`
    );

    await set(seenByRef, Date.now());

    console.log(`Message ${messageId} marked as seen by ${userId}`);
  } catch (error) {
    console.error('Error marking message as seen:', error);
    throw error;
  }
};

/**
 * Get delivery status for a message (who has seen it)
 */
export const getMessageDeliveryStatus = async (
  circleId: string,
  messageId: string
): Promise<Record<string, number>> => {
  try {
    const seenByRef = ref(db, `messages/${circleId}/${messageId}/seenBy`);
    const snapshot = await get(seenByRef);

    if (snapshot.exists()) {
      return snapshot.val() as Record<string, number>;
    }

    return {};
  } catch (error) {
    console.error('Error getting delivery status:', error);
    return {};
  }
};

/**
 * Clear all messages in a circle (admin only, careful!)
 */
export const clearCircleMessages = async (circleId: string): Promise<void> => {
  try {
    const messagesRef = ref(db, `messages/${circleId}`);

    await set(messagesRef, null);

    console.log(`All messages cleared for circle ${circleId}`);
  } catch (error) {
    console.error('Error clearing messages:', error);
    throw error;
  }
};

/**
 * Get message by ID
 */
export const getMessage = async (
  circleId: string,
  messageId: string
): Promise<Message | null> => {
  try {
    const messageRef = ref(db, `messages/${circleId}/${messageId}`);
    const snapshot = await get(messageRef);

    if (snapshot.exists()) {
      return snapshot.val() as Message;
    }

    return null;
  } catch (error) {
    console.error('Error fetching message:', error);
    throw error;
  }
};
