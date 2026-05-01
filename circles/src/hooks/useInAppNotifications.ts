import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  setInAppNotificationCallback,
  handleNotificationNavigation,
  type InAppNotification,
  type NotificationData,
} from '../services/notification.service';

/**
 * Hook to manage the in-app notification banner.
 *
 * - Registers a callback with notification.service so foreground notifications
 *   are captured and displayed as a custom banner instead of an OS alert.
 * - Provides handleNotificationPress which navigates to the right screen when
 *   the user taps the in-app banner.
 *
 * Use this in NotificationProvider (mounted inside NavigationContainer).
 */
export const useInAppNotifications = () => {
  const [currentNotification, setCurrentNotification] =
    useState<InAppNotification | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Register callback so foreground push arrives here as an in-app banner
    setInAppNotificationCallback((notification) => {
      setCurrentNotification(notification);
    });

    return () => {
      // Clear callback on unmount
      setInAppNotificationCallback(() => {});
    };
  }, []);

  /**
   * Called when the user taps the in-app banner.
   * Delegates navigation to handleNotificationNavigation from notification.service
   * (which uses the global navigationRef), then also tries the hook's navigation
   * as a fallback in case the ref isn't wired yet.
   */
  const handleNotificationPress = (notification: InAppNotification) => {
    dismissNotification();
    const data: NotificationData = notification.data;

    try {
      switch (data.type) {
        case 'new_message':
          if (data.circleId) {
            navigation.navigate('CircleChatScreen' as never, {
              circleId: data.circleId,
            } as never);
          }
          break;

        case 'new_member':
          if (data.circleId) {
            navigation.navigate('CircleScreen' as never, {
              circleId: data.circleId,
            } as never);
          }
          break;

        case 'new_plan':
        case 'rsvp_nudge':
        case 'plan_reminder':
          if (data.circleId && data.planId) {
            navigation.navigate('PlanDetailScreen' as never, {
              circleId: data.circleId,
              planId: data.planId,
            } as never);
          } else if (data.circleId) {
            navigation.navigate('CirclePlannerScreen' as never, {
              circleId: data.circleId,
            } as never);
          }
          break;

        case 'transit_match':
          if (data.cardId) {
            navigation.navigate('FeedScreen' as never, {
              highlightCardId: data.cardId,
            } as never);
          }
          break;

        case 'archive_prompt':
          // Handled by ArchivePromptHandler — no navigation needed
          break;

        default:
          console.warn('Unknown notification type in banner press:', (data as any).type);
      }
    } catch (error) {
      console.error('Error handling in-app notification press:', error);
    }
  };

  const dismissNotification = () => {
    setCurrentNotification(null);
  };

  return {
    currentNotification,
    handleNotificationPress,
    dismissNotification,
  };
};
