import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore, auth } from './firebase';
import { NavigationContainerRef } from '@react-navigation/native';
import Constants from 'expo-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationData {
  type:
    | 'new_message'
    | 'new_member'
    | 'new_plan'
    | 'rsvp_nudge'
    | 'plan_reminder'
    | 'transit_match'
    | 'archive_prompt';
  circleId?: string;
  planId?: string;
  cardId?: string;
  memberName?: string;
  planTitle?: string;
  planDate?: string;
  routeId?: string;
  senderName?: string;
}

export interface InAppNotification {
  id: string;
  icon: string;
  title: string;
  message: string;
  data: NotificationData;
}

// ─── Module-level state ───────────────────────────────────────────────────────

// Callback for showing in-app notifications (set by NotificationProvider/useInAppNotifications)
let inAppNotificationCallback: ((notification: InAppNotification) => void) | null = null;

// Navigation reference for deep linking
let navigationRef: NavigationContainerRef<any> | null = null;

// ─── Setters ──────────────────────────────────────────────────────────────────

/**
 * Set the navigation reference for deep linking from background/killed state.
 */
export const setNavigationRef = (ref: NavigationContainerRef<any>) => {
  navigationRef = ref;
};

/**
 * Set the callback for showing in-app notifications (foreground state).
 */
export const setInAppNotificationCallback = (
  callback: (notification: InAppNotification) => void
) => {
  inAppNotificationCallback = callback;
};

// ─── Setup ────────────────────────────────────────────────────────────────────

/**
 * Configure the single canonical notification handler.
 * - When foreground: suppress OS alert, show our custom in-app banner instead.
 * - When background/killed: tapping navigates via addNotificationResponseReceivedListener.
 *
 * Call this ONCE when the app loads (in RootNavigator or App).
 * Do NOT call Notifications.setNotificationHandler anywhere else.
 */
export const configureNotificationHandlers = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as unknown as NotificationData;

      // Show custom in-app banner instead of OS notification
      if (inAppNotificationCallback) {
        const inAppNotif = createInAppNotification(
          notification.request.content.title || '',
          notification.request.content.body || '',
          data
        );
        inAppNotificationCallback(inAppNotif);
      }

      return {
        shouldShowAlert: false,   // suppress OS banner in foreground
        shouldShowBanner: false,  // required in expo-notifications 0.32+
        shouldShowList: true,     // still add to notification centre list
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // User tapped notification from background / notification tray
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as unknown as NotificationData;
    handleNotificationNavigation(data);
  });

  // App was cold-launched from a notification tap
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      const data = response.notification.request.content.data as unknown as NotificationData;
      handleNotificationNavigation(data);
    }
  });
};

/**
 * Request notification permissions and register the Expo push token.
 * Call this after the user is authenticated.
 */
export const setupPushNotifications = async (): Promise<boolean> => {
  try {

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return false;
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Circles',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A6B5A',
        showBadge: true,
      });
    }

    // Get Expo push token using EAS project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? 'ed6fb5d3-14a6-4d38-a076-05016c4a596c';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const currentUser = auth.currentUser;
    if (currentUser) {
      await savePushToken(currentUser.uid, token);
      console.log('Push token registered:', token.slice(0, 20) + '…');
    }

    return true;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return false;
  }
};

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * Save push token to Firestore pushTokens subcollection.
 * Uses the token value itself as the doc ID to prevent duplicates.
 */
const savePushToken = async (uid: string, token: string): Promise<void> => {
  try {
    // Use a safe doc ID derived from the token (strip leading "ExponentPushToken[" prefix)
    const tokenDocId = token.replace(/[^a-zA-Z0-9_-]/g, '_');
    const tokenRef = doc(firestore, 'users', uid, 'pushTokens', tokenDocId);

    await setDoc(tokenRef, {
      token,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
};

/**
 * Remove the current device's push token from Firestore.
 * Call this on sign-out to stop notifications to a logged-out device.
 */
export const removePushToken = async (uid: string): Promise<void> => {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? 'ed6fb5d3-14a6-4d38-a076-05016c4a596c';

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    const tokenDocId = token.replace(/[^a-zA-Z0-9_-]/g, '_');

    await deleteDoc(doc(firestore, 'users', uid, 'pushTokens', tokenDocId));
    console.log('Push token removed on logout');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
};

// ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Navigate to the correct screen based on notification type.
 * Exported so hooks can use it directly if needed.
 */
export const handleNotificationNavigation = (data: NotificationData) => {
  if (!navigationRef) {
    console.warn('Navigation ref not set — cannot deep-link from notification');
    return;
  }

  try {
    switch (data.type) {
      case 'new_message':
        if (data.circleId) {
          navigationRef.navigate('CircleChatScreen', { circleId: data.circleId });
        }
        break;

      case 'new_member':
        if (data.circleId) {
          navigationRef.navigate('CircleScreen', { circleId: data.circleId });
        }
        break;

      case 'new_plan':
      case 'rsvp_nudge':
      case 'plan_reminder':
        if (data.circleId && data.planId) {
          navigationRef.navigate('PlanDetailScreen', {
            circleId: data.circleId,
            planId: data.planId,
          });
        } else if (data.circleId) {
          navigationRef.navigate('CirclePlannerScreen', { circleId: data.circleId });
        }
        break;

      case 'transit_match':
        if (data.cardId) {
          navigationRef.navigate('FeedScreen', { highlightCardId: data.cardId });
        }
        break;

      case 'archive_prompt':
        // Handled by ArchivePromptHandler component — no navigation needed
        break;

      default:
        console.warn('Unknown notification type for deep-link:', (data as any).type);
    }
  } catch (error) {
    console.error('Error during notification navigation:', error);
  }
};

// ─── In-App Notification ──────────────────────────────────────────────────────

/**
 * Build an InAppNotification object from raw push content.
 */
const createInAppNotification = (
  title: string,
  message: string,
  data: NotificationData
): InAppNotification => {
  const iconMap: Record<NotificationData['type'], string> = {
    new_message: '💬',
    new_member: '👋',
    new_plan: '📅',
    rsvp_nudge: '⏰',
    plan_reminder: '🔔',
    transit_match: '🚂',
    archive_prompt: '✈️',
  };

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    icon: iconMap[data.type] ?? '🔔',
    title,
    message,
    data,
  };
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Send a local notification immediately (useful for testing).
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data: NotificationData
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data as any, sound: true },
    trigger: null,
  });
};

export const cancelAllNotifications = async (): Promise<void> =>
  Notifications.cancelAllScheduledNotificationsAsync();

export const getBadgeCount = async (): Promise<number> =>
  Notifications.getBadgeCountAsync();

export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

export const clearBadge = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};

/**
 * Format notification copy based on type (used server-side helper mirror).
 */
export const formatNotificationMessage = (
  data: NotificationData
): { title: string; body: string } => {
  switch (data.type) {
    case 'new_message':
      return {
        title: data.circleId ? 'New Message' : 'New Message',
        body: `${data.senderName ?? 'Someone'} sent a message`,
      };
    case 'new_member':
      return { title: 'New Member', body: `${data.memberName} joined your circle` };
    case 'new_plan':
      return { title: 'New Plan', body: `${data.memberName} created — ${data.planTitle}` };
    case 'rsvp_nudge':
      return { title: 'RSVP Reminder', body: `Don't forget to RSVP for ${data.planTitle}` };
    case 'plan_reminder':
      return { title: 'Plan Tomorrow', body: `${data.planTitle} is tomorrow!` };
    case 'transit_match':
      return { title: 'New Transit Circle', body: `A new circle for ${data.routeId}` };
    case 'archive_prompt':
      return { title: 'Journey Complete', body: 'Your circle has been archived' };
    default:
      return { title: 'Notification', body: 'You have a new notification' };
  }
};
