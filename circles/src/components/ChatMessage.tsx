import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  GestureResponderEvent,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Message } from '../types/message.types';
import {
  deleteMessageForMe,
  deleteMessageForEveryone,
  addReaction,
  removeReaction,
} from '../services/messageService';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: Message;
  circleId: string;
  currentUserId: string;
  onReply: (message: Message) => void;
  onReactionLongPress?: (message: Message) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MESSAGE_MAX_WIDTH = SCREEN_WIDTH * 0.75;

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  circleId,
  currentUserId,
  onReply,
  onReactionLongPress,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [canDeleteForEveryone, setCanDeleteForEveryone] = useState(false);

  React.useEffect(() => {
    // Check if message can be deleted for everyone (within 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const canDelete =
      message.senderUid === currentUserId && message.createdAt > fiveMinutesAgo;
    setCanDeleteForEveryone(canDelete);
  }, [message, currentUserId]);

  const isOwnMessage = message.senderUid === currentUserId;
  const isDeleted = message.deletedForAll;

  const handleMenuOpen = () => {
    setMenuVisible(true);
  };

  const handleDeleteForMe = async () => {
    try {
      setMenuVisible(false);
      await deleteMessageForMe(circleId, message.id, currentUserId);
      Alert.alert('Success', 'Message deleted from your view');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete message');
      console.error('Error deleting message for me:', error);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!canDeleteForEveryone) {
      Alert.alert('Cannot delete', 'You can only delete messages within 5 minutes');
      return;
    }

    Alert.alert(
      'Delete for everyone?',
      'This will remove the message for all members in the circle.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setMenuVisible(false);
              await deleteMessageForEveryone(circleId, message.id, currentUserId);
              Alert.alert('Success', 'Message deleted for everyone');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete message');
              console.error('Error deleting message for everyone:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleReactionAdd = async (emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const userReactedWithEmoji = message.reactions[emoji]?.includes(currentUserId);

      if (userReactedWithEmoji) {
        // Remove reaction
        await removeReaction(circleId, message.id, emoji, currentUserId);
      } else {
        // Add reaction
        await addReaction(circleId, message.id, emoji, currentUserId);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update reaction');
      console.error('Error updating reaction:', error);
    }
  };

  const reactionEmojis = Object.keys(message.reactions || {});

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessage]}>
      {/* Avatar & Sender Info */}
      {!isOwnMessage && (
        <Image
          source={{ uri: message.senderAvatar }}
          style={styles.avatar}
        />
      )}

      <View style={styles.messageContent}>
        {/* Sender Name (for other users) */}
        {!isOwnMessage && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}

        {/* Reply Preview */}
        {message.replyTo && (
          <View style={styles.replyPreview}>
            <Text style={styles.replyLabel}>Replying to {message.replyTo.senderName}</Text>
            <Text style={styles.replyText} numberOfLines={2}>
              {message.replyTo.text}
            </Text>
          </View>
        )}

        {/* Message Bubble */}
        <TouchableOpacity
          style={[
            styles.messageBubble,
            isOwnMessage && styles.ownBubble,
            !isOwnMessage && styles.otherBubble,
          ]}
          onPress={handleMenuOpen}
          onLongPress={() => onReactionLongPress?.(message)}
        >
          {isDeleted ? (
            <Text style={[styles.messageText, styles.deletedText]}>
              [Message deleted]
            </Text>
          ) : message.gifUrl ? (
            <Image
              source={{ uri: message.gifUrl }}
              style={styles.gifImage}
              resizeMode="contain"
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwnMessage && styles.ownText,
              ]}
            >
              {message.text}
            </Text>
          )}
        </TouchableOpacity>

        {/* Reactions */}
        {reactionEmojis.length > 0 && (
          <View style={styles.reactionsContainer}>
            {reactionEmojis.map((emoji) => {
              const userReacted = message.reactions[emoji]?.includes(currentUserId);
              const count = message.reactions[emoji]?.length || 0;

              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.reactionBubble,
                    userReacted && styles.userReactionBubble,
                  ]}
                  onPress={() => handleReactionAdd(emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {count > 1 && (
                    <Text style={styles.reactionCount}>{count}</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Add reaction button */}
            <TouchableOpacity
              style={styles.addReactionButton}
              onPress={() => onReactionLongPress?.(message)}
            >
              <Text style={styles.addReactionText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timestamp & Delivery Status */}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {format(new Date(message.createdAt), 'HH:mm')}
          </Text>
          {isOwnMessage && (
            <Text style={styles.deliveryStatus}>
              {message.createdAt
                ? message.isPending
                  ? '⏱️'
                  : '✓✓'
                : '✓'}
            </Text>
          )}
        </View>
      </View>

      {/* Context Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={onReply}
            >
              <Text style={styles.menuItemText}>↩️ Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                // This would open emoji picker - for now, show a placeholder
                Alert.alert('Add Reaction', 'Long-press the message to add emoji reactions');
              }}
            >
              <Text style={styles.menuItemText}>😊 React</Text>
            </TouchableOpacity>

            {isOwnMessage && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDeleteForMe}
                >
                  <Text style={styles.menuItemText}>🗑️ Delete for me</Text>
                </TouchableOpacity>

                {canDeleteForEveryone && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleDeleteForEveryone}
                  >
                    <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                      ⛔ Delete for everyone
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    flex: 1,
    maxWidth: MESSAGE_MAX_WIDTH,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  replyPreview: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: '#e5e5ea',
  },
  messageText: {
    fontSize: 14,
    color: '#000',
  },
  ownText: {
    color: '#fff',
  },
  deletedText: {
    color: '#999',
    fontStyle: 'italic',
  },
  gifImage: {
    width: MESSAGE_MAX_WIDTH - 24,
    height: 200,
    borderRadius: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userReactionBubble: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  addReactionButton: {
    backgroundColor: '#f0f0f0',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addReactionText: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginRight: 4,
  },
  deliveryStatus: {
    fontSize: 11,
    color: '#007AFF',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 200,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
  },
  menuItemDanger: {
    color: '#d9534f',
  },
});
