import { create } from 'zustand';
import { Message } from '../types/message.types';

/**
 * Messages Store - Manages messages for all circles
 * Holds real-time message data from Firebase
 */
interface MessagesStoreState {
  // Messages organized by circleId
  messages: Record<string, Message[]>;
  
  // Unread counts per circle
  unreadCounts: Record<string, number>;
  
  // Loading/error states
  loadingCircles: Set<string>;
  errors: Record<string, string | null>;

  // Setters
  setMessages: (circleId: string, messages: Message[]) => void;
  addMessage: (circleId: string, message: Message) => void;
  updateMessage: (circleId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (circleId: string, messageId: string) => void;
  
  // Reactions
  addReaction: (circleId: string, messageId: string, emoji: string, userId: string) => void;
  removeReaction: (circleId: string, messageId: string, emoji: string, userId: string) => void;
  
  // Unread management
  incrementUnreadCount: (circleId: string, count?: number) => void;
  clearUnreadCount: (circleId: string) => void;
  setUnreadCount: (circleId: string, count: number) => void;
  
  // Loading states
  setLoading: (circleId: string, loading: boolean) => void;
  setError: (circleId: string, error: string | null) => void;

  // Getters
  getCircleMessages: (circleId: string) => Message[];
  getUnreadCount: (circleId: string) => number;
  isLoading: (circleId: string) => boolean;
  getError: (circleId: string) => string | null;
  
  // Utils
  clearCircle: (circleId: string) => void;
  reset: () => void;
}

export const useMessagesStore = create<MessagesStoreState>((set, get) => ({
  messages: {},
  unreadCounts: {},
  loadingCircles: new Set(),
  errors: {},

  setMessages: (circleId: string, messages: Message[]) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [circleId]: messages,
      },
      errors: {
        ...state.errors,
        [circleId]: null,
      },
    })),

  addMessage: (circleId: string, message: Message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [circleId]: [message, ...(state.messages[circleId] || [])],
      },
    })),

  updateMessage: (circleId: string, messageId: string, updates: Partial<Message>) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [circleId]: (state.messages[circleId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  removeMessage: (circleId: string, messageId: string) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [circleId]: (state.messages[circleId] || []).filter((msg) => msg.id !== messageId),
      },
    })),

  addReaction: (circleId: string, messageId: string, emoji: string, userId: string) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [circleId]: (state.messages[circleId] || []).map((msg) => {
          if (msg.id === messageId) {
            const reactions = { ...msg.reactions };
            if (!reactions[emoji]) {
              reactions[emoji] = [];
            }
            if (!reactions[emoji].includes(userId)) {
              reactions[emoji].push(userId);
            }
            return { ...msg, reactions };
          }
          return msg;
        }),
      },
    })),

  removeReaction: (circleId: string, messageId: string, emoji: string, userId: string) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [circleId]: (state.messages[circleId] || []).map((msg) => {
          if (msg.id === messageId) {
            const reactions = { ...msg.reactions };
            if (reactions[emoji]) {
              reactions[emoji] = reactions[emoji].filter((uid) => uid !== userId);
              if (reactions[emoji].length === 0) {
                delete reactions[emoji];
              }
            }
            return { ...msg, reactions };
          }
          return msg;
        }),
      },
    })),

  incrementUnreadCount: (circleId: string, count: number = 1) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [circleId]: (state.unreadCounts[circleId] || 0) + count,
      },
    })),

  clearUnreadCount: (circleId: string) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [circleId]: 0,
      },
    })),

  setUnreadCount: (circleId: string, count: number) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [circleId]: Math.max(0, count),
      },
    })),

  setLoading: (circleId: string, loading: boolean) =>
    set((state) => {
      const newLoading = new Set(state.loadingCircles);
      if (loading) {
        newLoading.add(circleId);
      } else {
        newLoading.delete(circleId);
      }
      return { loadingCircles: newLoading };
    }),

  setError: (circleId: string, error: string | null) =>
    set((state) => ({
      errors: {
        ...state.errors,
        [circleId]: error,
      },
    })),

  getCircleMessages: (circleId: string) =>
    get().messages[circleId] || [],

  getUnreadCount: (circleId: string) =>
    get().unreadCounts[circleId] || 0,

  isLoading: (circleId: string) =>
    get().loadingCircles.has(circleId),

  getError: (circleId: string) =>
    get().errors[circleId] || null,

  clearCircle: (circleId: string) =>
    set((state) => {
      const { [circleId]: _, ...remainingMessages } = state.messages;
      const { [circleId]: __, ...remainingErrors } = state.errors;
      const newLoading = new Set(state.loadingCircles);
      newLoading.delete(circleId);

      return {
        messages: remainingMessages,
        errors: remainingErrors,
        loadingCircles: newLoading,
        unreadCounts: {
          ...state.unreadCounts,
          [circleId]: 0,
        },
      };
    }),

  reset: () =>
    set({
      messages: {},
      unreadCounts: {},
      loadingCircles: new Set(),
      errors: {},
    }),
}));
