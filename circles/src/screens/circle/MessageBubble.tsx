import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  GestureResponderEvent,
} from 'react-native';
import { Message } from '../../types/message.types';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { formatTime } from '../../utils/dateUtils';
import { PollCard } from '../../components/chat/PollCard';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  circleId?: string;
  onLongPress?: () => void;
  onReply?: () => void;
}

/**
 * Reaction pill component
 */
const ReactionPill: React.FC<{
  emoji: string;
  count: number;
  onPress?: () => void;
}> = ({ emoji, count, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 4,
      marginTop: 4,
    }}
  >
    <Text style={{ fontSize: 14, marginRight: 2 }}>{emoji}</Text>
    <Text
      style={{
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
      }}
    >
      {count}
    </Text>
  </TouchableOpacity>
);

/**
 * MessageBubble - Individual message display
 */
export default function MessageBubble({
  message,
  isOwn,
  onLongPress,
  onReply,
}: MessageBubbleProps) {
  if (message.type === 'poll' && message.pollId && circleId) {
    return (
      <View style={{ alignItems: 'center', width: '100%', marginVertical: 8 }}>
        <PollCard pollId={message.pollId} circleId={circleId} />
      </View>
    );
  }

  if (message.isSystem) {
    // System message (joined, left, etc.)
    return (
      <View
        style={{
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontSize: Typography.fontSize.sm,
            color: Colors.textTertiary,
            fontStyle: 'italic',
          }}
        >
          {message.text}
        </Text>
      </View>
    );
  }

  // Regular message bubble
  const bubbleAlign = isOwn ? 'flex-end' : 'flex-start';
  const bubbleBg = isOwn ? Colors.primary : Colors.surfaceAlt;
  const textColor = isOwn ? Colors.surface : Colors.textPrimary;
  const avatarSize = 32;

  // Count reactions
  const reactionCounts: Record<string, number> = {};
  Object.entries(message.reactions || {}).forEach(([emoji, uids]) => {
    reactionCounts[emoji] = uids.length;
  });

  return (
    <View
      style={{
        flexDirection: isOwn ? 'row-reverse' : 'row',
        paddingHorizontal: 16,
        paddingVertical: 4,
        alignItems: 'flex-end',
      }}
    >
      {/* Avatar (others only) */}
      {!isOwn && (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: Colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
            marginBottom: message.reactions && Object.keys(message.reactions).length > 0 ? 20 : 0,
          }}
        >
          {message.senderAvatar ? (
            <Image
              source={{ uri: message.senderAvatar }}
              style={{ width: '100%', height: '100%', borderRadius: avatarSize / 2 }}
            />
          ) : (
            <Text style={{ fontSize: 16 }}>👤</Text>
          )}
        </View>
      )}

      {/* Message content */}
      <View style={{ flex: 1, alignItems: bubbleAlign }}>
        {/* Sender name (others only) */}
        {!isOwn && (
          <Text
            style={{
              fontSize: Typography.fontSize.xs,
              color: Colors.textSecondary,
              marginBottom: 4,
              marginLeft: 4,
            }}
          >
            {message.senderName}
          </Text>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <View
            style={{
              backgroundColor: isOwn ? 'rgba(255, 255, 255, 0.2)' : Colors.border,
              borderLeftWidth: 3,
              borderLeftColor: Colors.accent,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginBottom: 8,
              borderRadius: 4,
              maxWidth: 200,
            }}
          >
            <Text
              style={{
                fontSize: Typography.fontSize.xs,
                color: Colors.textSecondary,
                fontWeight: Typography.fontWeight.semibold,
              }}
            >
              {message.replyTo.senderName}
            </Text>
            <Text
              style={{
                fontSize: Typography.fontSize.sm,
                color: Colors.textSecondary,
              }}
              numberOfLines={1}
            >
              {message.replyTo.text}
            </Text>
          </View>
        )}

        {/* Message bubble */}
        <TouchableOpacity
          onLongPress={onLongPress}
          delayLongPress={400}
          activeOpacity={0.7}
          style={{
            backgroundColor: bubbleBg,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            maxWidth: 250,
          }}
        >
          {message.gifUrl && (
            <Image
              source={{ uri: message.gifUrl }}
              style={{
                width: 200,
                height: 150,
                borderRadius: 8,
                marginBottom: message.text ? 8 : 0,
              }}
            />
          )}

          {message.imageUrl && (
            <Image
              source={{ uri: message.imageUrl }}
              style={{
                width: 200,
                height: 150,
                borderRadius: 8,
                marginBottom: message.text ? 8 : 0,
              }}
            />
          )}

          {message.deletedForAll ? (
            <Text
              style={{
                fontSize: Typography.fontSize.md,
                color: textColor,
                fontStyle: 'italic',
                opacity: 0.6,
              }}
            >
              [Message deleted]
            </Text>
          ) : (
            <Text
              style={{
                fontSize: Typography.fontSize.md,
                color: textColor,
              }}
            >
              {message.text}
            </Text>
          )}

          {/* Delivery status (own messages) */}
          {isOwn && (
            <View style={{ flexDirection: 'row', marginTop: 4, alignItems: 'center' }}>
              {message.isPending ? (
                <Text style={{ fontSize: 10, color: Colors.textTertiary }}>
                  ⏱
                </Text>
              ) : (
                <Text style={{ fontSize: 10, color: Colors.textTertiary }}>
                  ✓✓
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Time */}
        <Text
          style={{
            fontSize: Typography.fontSize.xs,
            color: Colors.textTertiary,
            marginTop: 4,
            marginLeft: isOwn ? 0 : 4,
            marginRight: isOwn ? 4 : 0,
          }}
        >
          {formatTime(message.createdAt)}
        </Text>

        {/* Reactions */}
        {Object.keys(reactionCounts).length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              marginTop: 4,
              paddingHorizontal: 4,
              flexWrap: 'wrap',
              justifyContent: bubbleAlign === 'flex-end' ? 'flex-end' : 'flex-start',
            }}
          >
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <ReactionPill
                key={emoji}
                emoji={emoji}
                count={count}
              />
            ))}
          </View>
        )}
      </View>

      {/* Margin for reactions on own messages */}
      {isOwn && (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            marginLeft: 8,
            marginBottom: message.reactions && Object.keys(message.reactions).length > 0 ? 20 : 0,
          }}
        />
      )}
    </View>
  );
}
