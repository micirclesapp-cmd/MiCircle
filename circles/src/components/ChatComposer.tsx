import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Message } from '../types/message.types';
import { sendMessage } from '../services/messageService';
import { Gif } from '../services/gifService';
import { EmojiPickerModal } from './EmojiPickerModal';
import { GifPickerModal } from './GifPickerModal';

interface ChatComposerProps {
  circleId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  onMessageSent?: (messageId: string) => void;
  replyTo?: Message | null;
  onReplyCleared?: () => void;
}

const MAX_MESSAGE_LENGTH = 2000;

export const ChatComposer: React.FC<ChatComposerProps> = ({
  circleId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onMessageSent,
  replyTo,
  onReplyCleared,
}) => {
  const [messageText, setMessageText] = useState('');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [sending, setSending] = useState(false);

  const handleEmojiSelected = (emoji: string) => {
    const newText = messageText + emoji;
    if (newText.length <= MAX_MESSAGE_LENGTH) {
      setMessageText(newText);
    } else {
      Alert.alert('Message too long', `Maximum ${MAX_MESSAGE_LENGTH} characters`);
    }
    setEmojiPickerVisible(false);
  };

  const handleGifSelected = async (gif: Gif) => {
    setSending(true);
    try {
      // Send message with GIF
      const messageId = await sendMessage(
        circleId,
        currentUserId,
        currentUserName,
        currentUserAvatar,
        '', // no text for GIF-only message
        gif.url,
        replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text || `[${replyTo.gifUrl ? 'GIF' : 'Message'}]`,
              senderName: replyTo.senderName,
            }
          : undefined
      );

      onMessageSent?.(messageId);
      setMessageText('');
      onReplyCleared?.();
      setGifPickerVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to send GIF message');
      console.error('Error sending GIF message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Empty message', 'Please type a message');
      return;
    }

    if (messageText.length > MAX_MESSAGE_LENGTH) {
      Alert.alert('Message too long', `Maximum ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setSending(true);
    try {
      const messageId = await sendMessage(
        circleId,
        currentUserId,
        currentUserName,
        currentUserAvatar,
        messageText.trim(),
        undefined,
        replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text || `[${replyTo.gifUrl ? 'GIF' : 'Message'}]`,
              senderName: replyTo.senderName,
            }
          : undefined
      );

      onMessageSent?.(messageId);
      setMessageText('');
      onReplyCleared?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const characterCount = messageText.length;
  const isNearLimit = characterCount > MAX_MESSAGE_LENGTH * 0.8;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Reply Preview */}
      {replyTo && (
        <View style={styles.replyPreviewContainer}>
          <View style={styles.replyPreviewContent}>
            <Text style={styles.replyPreviewLabel}>Replying to {replyTo.senderName}</Text>
            <Text style={styles.replyPreviewText} numberOfLines={2}>
              {replyTo.text || (replyTo.gifUrl ? '[GIF]' : '[Message]')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearReplyButton}
            onPress={() => onReplyCleared?.()}
          >
            <Text style={styles.clearReplyText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!sending}
        />

        {/* Button Container */}
        <View style={styles.buttonContainer}>
          {/* Emoji Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setEmojiPickerVisible(true)}
            disabled={sending}
          >
            <Text style={styles.iconButtonText}>😀</Text>
          </TouchableOpacity>

          {/* GIF Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setGifPickerVisible(true)}
            disabled={sending}
          >
            <Text style={styles.iconButtonText}>GIF</Text>
          </TouchableOpacity>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <Text style={styles.sendButtonText}>⏱️</Text>
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Character Count Warning */}
      {isNearLimit && (
        <View style={styles.charCountContainer}>
          <Text
            style={[
              styles.charCountText,
              characterCount > MAX_MESSAGE_LENGTH && styles.charCountError,
            ]}
          >
            {characterCount} / {MAX_MESSAGE_LENGTH}
          </Text>
        </View>
      )}

      {/* Emoji Picker Modal */}
      <EmojiPickerModal
        visible={emojiPickerVisible}
        onEmojiSelected={handleEmojiSelected}
        onClose={() => setEmojiPickerVisible(false)}
      />

      {/* GIF Picker Modal */}
      <GifPickerModal
        visible={gifPickerVisible}
        onGifSelected={handleGifSelected}
        onClose={() => setGifPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 12,
    color: '#666',
  },
  clearReplyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearReplyText: {
    fontSize: 16,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#b3d9f2',
  },
  sendButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  charCountContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  charCountText: {
    fontSize: 11,
    color: '#999',
  },
  charCountError: {
    color: '#d9534f',
    fontWeight: '600',
  },
});
