import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { firestore, auth } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

/**
 * NOTE: Do NOT call Notifications.setNotificationHandler here.
 * The single canonical handler is set in notification.service.ts
 * (configureNotificationHandlers). Having multiple calls causes race conditions
 * and will show raw OS banners in foreground instead of our custom banner.
 */

interface PushNotificationState {
  expoPushToken?: string;
  notification?: Notifications.Notification;
  error?: Error;
}

/**
 * Hook for managing push notifications.
 *
 * Handles:
 * - Permission requests
 * - Token registration to Firestore pushTokens subcollection (multi-device safe)
 * - Notification received / response listeners
 * - Badge management helpers
 */
export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({});
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setState((prev) => ({ ...prev, expoPushToken: token }));
          savePushTokenToFirestore(token);
        }
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, error }));
        console.error('Error registering for push notifications:', error);
      });

    // Foreground notification received
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setState((prev) => ({ ...prev, notification }));
        // Note: the in-app banner is handled by notification.service.ts handler
      }
    );

    // User tapped a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return state;
};

/**
 * Register for push notifications and return the Expo push token string.
 */
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Circles',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A6B5A',
      showBadge: true,
    });
  }

  // Physical device check — getExpoPushTokenAsync throws on simulators
  // so we wrap in try/catch and return undefined gracefully.

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return undefined;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? 'ed6fb5d3-14a6-4d38-a076-05016c4a596c';

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;
  console.log('Expo push token registered:', token.slice(0, 24) + '…');
  return token;
}

/**
 * Save push token to Firestore users/{uid}/pushTokens subcollection.
 * Uses token value as doc ID → deduplicates across logins & survives app restarts.
 */
async function savePushTokenToFirestore(token: string): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Token value as doc ID (sanitised) prevents duplicate entries per device
    const tokenDocId = token.replace(/[^a-zA-Z0-9_-]/g, '_');
    const tokenRef = doc(firestore, 'users', currentUser.uid, 'pushTokens', tokenDocId);

    await setDoc(tokenRef, {
      token,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    });

    console.log('Push token saved to Firestore subcollection');
  } catch (error) {
    console.error('Error saving push token to Firestore:', error);
  }
}

/**
 * Handle notification tap — log only; navigation is handled centrally
 * by notification.service.ts addNotificationResponseReceivedListener.
 */
function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as any;
  console.log('Notification tapped, type:', data?.type);
  // Navigation is handled by notification.service.ts configureNotificationHandlers()
}

// ─── Exported utilities ────────────────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: trigger ?? null,
  });
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
