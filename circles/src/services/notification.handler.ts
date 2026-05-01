import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { firestore, auth } from './firebase';

interface ArchivePromptData {
  circleId: string;
  circleName: string;
  action: 'archive_prompt';
}

/**
 * Hook to handle notification responses and deep links
 */
export const useNotificationHandler = () => {
  const [archivePrompt, setArchivePrompt] = useState<ArchivePromptData | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Handle notification when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as any;
        if (data.action === 'archive_prompt') {
          setArchivePrompt({
            circleId: data.circleId,
            circleName: data.circleName,
            action: 'archive_prompt',
          });
        }
      }
    );

    // Handle notification when user taps on it
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data.action === 'archive_prompt') {
          setArchivePrompt({
            circleId: data.circleId,
            circleName: data.circleName,
            action: 'archive_prompt',
          });
        }
      }
    );

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as any;
        if (data.action === 'archive_prompt') {
          setArchivePrompt({
            circleId: data.circleId,
            circleName: data.circleName,
            action: 'archive_prompt',
          });
        }
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const handleKeepAsMemory = async () => {
    if (!archivePrompt || !auth.currentUser) return;

    try {
      // Move circle to user's "Past Circles" collection
      const userRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        pastCircles: arrayRemove(archivePrompt.circleId),
      });

      // Add to past circles
      await updateDoc(userRef, {
        pastCircles: [...([] as string[]), archivePrompt.circleId],
      });

      setArchivePrompt(null);
    } catch (error) {
      console.error('Error keeping circle as memory:', error);
    }
  };

  const handleLetGo = async () => {
    if (!archivePrompt || !auth.currentUser) return;

    try {
      // Remove user from circle's members list
      const circleRef = doc(firestore, 'public_circles', archivePrompt.circleId);
      await updateDoc(circleRef, {
        members: arrayRemove(auth.currentUser.uid),
      });

      setArchivePrompt(null);
    } catch (error) {
      console.error('Error letting go of circle:', error);
    }
  };

  const dismissArchivePrompt = () => {
    setArchivePrompt(null);
  };

  return {
    archivePrompt,
    handleKeepAsMemory,
    handleLetGo,
    dismissArchivePrompt,
  };
};


/**
 * @deprecated Use configureNotificationHandlers() from notification.service.ts instead.
 * This function is kept as a no-op to avoid import errors in legacy call sites.
 * The canonical handler (foreground suppression + in-app banner) is set in notification.service.ts.
 */
export const configureNotifications = () => {
  // No-op: handler is configured in notification.service.ts configureNotificationHandlers()
  // Do NOT set a second Notifications.setNotificationHandler here — it would override
  // the foreground suppression and show raw OS banners instead of our custom banner.
  Notifications.requestPermissionsAsync().then((status) => {
    if (status.granted) {
      console.log('Notification permissions granted');
    } else {
      console.log('Notification permissions denied');
    }
  });
};

