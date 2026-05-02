import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Initialize Expo SDK
const expo = new Expo();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const realtimeDb = admin.database();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get all valid Expo push tokens for a user from their pushTokens subcollection.
 * Returns an array of { token, docId } so stale docs can be deleted by ID.
 */
const getUserPushTokens = async (
  uid: string
): Promise<{ token: string; docId: string }[]> => {
  try {
    const snapshot = await firestore
      .collection('users')
      .doc(uid)
      .collection('pushTokens')
      .get();

    const tokens: { token: string; docId: string }[] = [];
    snapshot.forEach((doc) => {
      const { token } = doc.data();
      if (token && Expo.isExpoPushToken(token)) {
        tokens.push({ token, docId: doc.id });
      }
    });
    return tokens;
  } catch (error) {
    console.error(`Error getting push tokens for ${uid}:`, error);
    return [];
  }
};

/**
 * Check user's notification preferences.
 * Returns true if the given preference key is not explicitly set to false.
 */
const isNotificationEnabled = async (
  uid: string,
  prefKey: 'messages' | 'planReminders'
): Promise<boolean> => {
  try {
    const userDoc = await firestore.collection('users').doc(uid).get();
    const prefs = userDoc.data()?.notificationPrefs || {};
    // Default to enabled if the field doesn't exist
    return prefs[prefKey] !== false;
  } catch {
    return true; // fail open
  }
};

/**
 * Delete a stale push token document silently.
 */
const deleteStaleToken = async (uid: string, docId: string): Promise<void> => {
  try {
    await firestore
      .collection('users')
      .doc(uid)
      .collection('pushTokens')
      .doc(docId)
      .delete();
    console.log(`Deleted stale token doc ${docId} for user ${uid}`);
  } catch (error) {
    console.error(`Failed to delete stale token ${docId}:`, error);
  }
};

/**
 * Send push notifications to multiple users.
 * Handles:
 *  - Multi-device: reads all tokens per user
 *  - Stale tokens: deletes DeviceNotRegistered / InvalidCredentials tokens
 *  - Notification preferences: skips users who opted out of the given type
 */
export const sendPushNotifications = async (
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, any>,
  prefKey: 'messages' | 'planReminders' = 'messages'
): Promise<void> => {
  try {
    // Map token → { uid, docId } so we can clean up stale tokens by owner
    const tokenMeta: { token: string; uid: string; docId: string }[] = [];
    const messages: ExpoPushMessage[] = [];

    for (const uid of userIds) {
      const enabled = await isNotificationEnabled(uid, prefKey);
      if (!enabled) continue;

      const tokens = await getUserPushTokens(uid);
      for (const { token, docId } of tokens) {
        tokenMeta.push({ token, uid, docId });
        messages.push({
          to: token,
          sound: 'default',
          title,
          body,
          data,
          priority: 'high',
          channelId: 'default',
        });
      }
    }

    if (messages.length === 0) {
      console.log('No valid tokens to send to.');
      return;
    }

    // Send in chunks and collect tickets
    const chunks = expo.chunkPushNotifications(messages);
    const allTickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        allTickets.push(...tickets);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    // Clean up stale tokens based on ticket errors
    for (let i = 0; i < allTickets.length; i++) {
      const ticket = allTickets[i];
      if (
        ticket.status === 'error' &&
        (ticket.details?.error === 'DeviceNotRegistered' ||
          ticket.details?.error === 'InvalidCredentials')
      ) {
        const meta = tokenMeta[i];
        if (meta) {
          await deleteStaleToken(meta.uid, meta.docId);
        }
      }
    }

    console.log(`Sent ${allTickets.length} push notifications`);
  } catch (error) {
    console.error('Error in sendPushNotifications:', error);
    throw error;
  }
};

// ─── Triggers ─────────────────────────────────────────────────────────────────

/**
 * RTDB trigger: Send notification when a new message is posted in a circle chat.
 * Fires within seconds of the write, meeting the "< 5s on 4G" criterion.
 */
export const onNewMessage = functions.database
  .ref('circles/{circleId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    try {
      const message = snapshot.val();
      if (!message) return;

      const { circleId } = context.params;
      const senderUid: string = message.senderUid;
      const senderName: string = message.senderName || 'Someone';
      const text: string = message.text || '';

      // Skip system messages
      if (message.isSystem) return;

      // Get circle members from Firestore
      const circleDoc = await firestore.collection('circles').doc(circleId).get();
      const circle = circleDoc.data();
      if (!circle) return;

      const members: string[] = circle.members || [];
      // Notify everyone except the sender
      const recipients = members.filter((uid: string) => uid !== senderUid);
      if (recipients.length === 0) return;

      const preview = text.startsWith('[GIF]')
        ? '📷 sent a GIF'
        : text.length > 60
        ? `${text.substring(0, 60)}…`
        : text;

      await sendPushNotifications(
        recipients,
        circle.name || 'New Message',
        `${senderName}: ${preview}`,
        {
          type: 'new_message',
          circleId,
          senderName,
        },
        'messages'
      );
    } catch (error) {
      console.error('onNewMessage error:', error);
    }
  });

/**
 * Firestore trigger: Send notification when a new member joins a circle.
 */
export const onNewMember = functions.firestore
  .document('circles/{circleId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const beforeMembers: string[] = before.members || [];
    const afterMembers: string[] = after.members || [];

    if (afterMembers.length <= beforeMembers.length) return;

    const newMembers = afterMembers.filter((m: string) => !beforeMembers.includes(m));

    for (const newMemberUid of newMembers) {
      const newMemberDoc = await firestore.collection('users').doc(newMemberUid).get();
      const newMemberName = newMemberDoc.data()?.displayName || 'Someone';

      const otherMembers = afterMembers.filter((m: string) => m !== newMemberUid);

      await sendPushNotifications(
        otherMembers,
        'New Member',
        `${newMemberName} joined your circle`,
        {
          type: 'new_member',
          circleId: context.params.circleId,
          memberName: newMemberName,
        },
        'messages'
      );
    }
  });

/**
 * Firestore trigger: Send notification when a new plan is created.
 */
export const onNewPlan = functions.firestore
  .document('circles/{circleId}/plans/{planId}')
  .onCreate(async (snapshot, context) => {
    const plan = snapshot.data();
    const circleId = context.params.circleId;

    const circleDoc = await firestore.collection('circles').doc(circleId).get();
    const circle = circleDoc.data();
    if (!circle) return;

    const members: string[] = circle.members || [];
    const creatorUid: string = plan.creatorUid;
    const otherMembers = members.filter((m: string) => m !== creatorUid);

    await sendPushNotifications(
      otherMembers,
      'New Plan 📅',
      `${plan.creatorName} created a plan — ${plan.title}`,
      {
        type: 'new_plan',
        circleId,
        planId: context.params.planId,
        planTitle: plan.title,
        planDate: plan.date,
      },
      'planReminders'
    );
  });

/**
 * Scheduled function (every 60 min, IST): Send plan reminders exactly 24 hours
 * before the plan. Plans store a `date` (YYYY-MM-DD) without a time, so we
 * default reminder time to 09:00 IST the day before.
 *
 * Logic: at each run, check if current time is between 08:55 and 09:05 IST.
 * If so, fetch all plans for tomorrow and notify members who RSVP'd "going".
 */
export const sendPlanReminders = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('Asia/Kolkata')
  .onRun(async (_context) => {
    try {
      // Only fire during the 9am IST window (08:55 – 09:05)
      const nowIST = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const hourIST = nowIST.getHours();
      const minuteIST = nowIST.getMinutes();
      const isReminderWindow =
        (hourIST === 8 && minuteIST >= 55) ||
        (hourIST === 9 && minuteIST <= 5);

      if (!isReminderWindow) {
        console.log(`Outside reminder window (${hourIST}:${minuteIST} IST). Skipping.`);
        return;
      }

      // Compute tomorrow's date in IST
      const tomorrow = new Date(nowIST);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      console.log(`Sending plan reminders for ${tomorrowStr}`);

      const circlesSnapshot = await firestore.collection('circles').get();

      for (const circleDoc of circlesSnapshot.docs) {
        const circleId = circleDoc.id;

        const plansSnapshot = await firestore
          .collection('circles')
          .doc(circleId)
          .collection('plans')
          .where('date', '==', tomorrowStr)
          .where('isArchived', '==', false)
          .get();

        for (const planDoc of plansSnapshot.docs) {
          const plan = planDoc.data();
          const planId = planDoc.id;
          const rsvps: Record<string, string> = plan.rsvps || {};

          const goingMembers = Object.keys(rsvps).filter(
            (uid) => rsvps[uid] === 'going'
          );

          if (goingMembers.length > 0) {
            await sendPushNotifications(
              goingMembers,
              '📅 Plan Tomorrow',
              `${plan.title} is tomorrow! See you there.`,
              {
                type: 'plan_reminder',
                circleId,
                planId,
                planTitle: plan.title,
              },
              'planReminders'
            );
          }
        }
      }

      console.log('Plan reminders sent for', tomorrowStr);
    } catch (error) {
      console.error('Error sending plan reminders:', error);
    }
  });

/**
 * Scheduled function (every 24 hours): Send RSVP nudges for plans in 3 days.
 */
export const sendRSVPNudges = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async (_context) => {
    try {
      const threeDaysFromNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const targetDateStr = threeDaysFromNow.toISOString().split('T')[0];

      const circlesSnapshot = await firestore.collection('circles').get();

      for (const circleDoc of circlesSnapshot.docs) {
        const circleId = circleDoc.id;
        const circle = circleDoc.data();

        const plansSnapshot = await firestore
          .collection('circles')
          .doc(circleId)
          .collection('plans')
          .where('date', '==', targetDateStr)
          .where('isArchived', '==', false)
          .get();

        for (const planDoc of plansSnapshot.docs) {
          const plan = planDoc.data();
          const planId = planDoc.id;
          const members: string[] = circle.members || [];
          const rsvps: Record<string, string> = plan.rsvps || {};
          const noRSVPMembers = members.filter((uid: string) => !rsvps[uid]);

          if (noRSVPMembers.length > 0) {
            await sendPushNotifications(
              noRSVPMembers,
              '⏰ RSVP Reminder',
              `Don't forget to RSVP for "${plan.title}"`,
              {
                type: 'rsvp_nudge',
                circleId,
                planId,
                planTitle: plan.title,
              },
              'planReminders'
            );
          }
        }
      }

      console.log('RSVP nudges sent');
    } catch (error) {
      console.error('Error sending RSVP nudges:', error);
    }
  });

/**
 * Firestore trigger: New transit circle — notify users with matching saved routes.
 */
export const onNewTransitCircle = functions.firestore
  .document('public_circles/{cardId}')
  .onCreate(async (snapshot, context) => {
    const circle = snapshot.data();
    if (!circle.transitRoute || !circle.transitDate) return;
    console.log('New transit circle created:', circle.name);
    
    try {
      const usersSnapshot = await firestore.collection('users').get();
      const matchedUserIds: string[] = [];

      for (const userDoc of usersSnapshot.docs) {
        if (userDoc.id === circle.creatorUid) continue; // Don't notify creator

        const userData = userDoc.data();
        const savedRoutes = userData.savedRoutes || [];
        
        if (savedRoutes.includes(circle.transitRoute)) {
          matchedUserIds.push(userDoc.id);
        }
      }

      if (matchedUserIds.length > 0) {
        await sendPushNotifications(
          matchedUserIds,
          'New Transit Circle 🚆',
          `A new circle for route ${circle.transitRoute} on ${circle.transitDate} was just created.`,
          {
            type: 'new_transit_circle',
            circleId: context.params.cardId,
            route: circle.transitRoute,
          },
          'messages'
        );
        console.log(`Notified ${matchedUserIds.length} users about new transit circle.`);
      }
    } catch (error) {
      console.error('Error notifying users for new transit circle:', error);
    }
  });

/**
 * HTTP callable: Send a test notification to the authenticated user.
 */
export const sendTestNotification = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { title, body, notificationType } = data;

    await sendPushNotifications(
      [context.auth.uid],
      title || 'Test Notification',
      body || 'This is a test notification from Circles.',
      {
        type: notificationType || 'new_message',
        circleId: 'test-circle-id',
      },
      'messages'
    );

    return { success: true, message: 'Test notification sent' };
  }
);

/**
 * Firestore trigger: Send notification when a join request is created (Notify Admin).
 */
export const onJoinRequest = functions.firestore
  .document('public_circles/{circleId}/joinRequests/{uid}')
  .onCreate(async (snapshot, context) => {
    const request = snapshot.data();
    const { circleId } = context.params;

    const circleDoc = await firestore.collection('public_circles').doc(circleId).get();
    const circle = circleDoc.data();
    if (!circle) return;

    await sendPushNotifications(
      [circle.creatorUid],
      'Join Request',
      `${request.name} wants to join ${circle.name}`,
      {
        type: 'join_request',
        circleId,
      },
      'messages'
    );
  });

/**
 * Firestore trigger: Send notification when a join request is updated (Approve/Decline).
 */
export const onJoinRequestUpdated = functions.firestore
  .document('public_circles/{circleId}/joinRequests/{uid}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();
    const { circleId, uid } = context.params;

    if (before.status === 'pending' && after.status === 'approved') {
      const circleDoc = await firestore.collection('public_circles').doc(circleId).get();
      const circle = circleDoc.data();
      if (!circle) return;

      await sendPushNotifications(
        [uid],
        'Request Approved ✅',
        `You can now chat in ${circle.name}`,
        {
          type: 'join_approved',
          circleId,
        },
        'messages'
      );
    }
  });
