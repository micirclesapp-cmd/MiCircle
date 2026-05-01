import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendPushNotifications } from './sendPushNotifications';

const firestore = admin.firestore();

/**
 * Firestore trigger: Send notification when a new availability check is created.
 */
export const onAvailabilityCheckCreated = functions.firestore
  .document('circles/{circleId}/availabilityPolls/{pollId}')
  .onCreate(async (snapshot, context) => {
    const poll = snapshot.data();
    const { circleId } = context.params;

    // Get circle members
    const circleDoc = await firestore.collection('circles').doc(circleId).get();
    const circle = circleDoc.data();
    if (!circle) return;

    // Get creator details
    const creatorDoc = await firestore.collection('users').doc(poll.creatorUid).get();
    const creatorName = creatorDoc.data()?.displayName || 'Someone';

    const members: string[] = circle.members || [];
    // Notify everyone except the creator
    const recipients = members.filter((uid: string) => uid !== poll.creatorUid);
    
    if (recipients.length === 0) return;

    await sendPushNotifications(
      recipients,
      'Availability Check 📅',
      `${creatorName} is checking dates for a new plan!`,
      {
        type: 'availability_check',
        circleId,
        pollId: context.params.pollId,
      },
      'planReminders'
    );
  });

/**
 * Scheduled Cloud Function that runs every day at 2 AM to clean up
 * availability checks that are older than 7 days.
 */
export const cleanupAvailabilityChecks = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    try {
      const now = Date.now();
      // 7 days in milliseconds
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      // Convert to Firestore timestamp
      const expirationDate = admin.firestore.Timestamp.fromMillis(sevenDaysAgo);

      // Note: We need a collectionGroup query to find all availabilityPolls across all circles
      const pollsSnapshot = await firestore
        .collectionGroup('availabilityPolls')
        .where('createdAt', '<', expirationDate)
        .get();

      if (pollsSnapshot.empty) {
        console.log('No expired availability polls to clean up.');
        return null;
      }

      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      let deletedCount = 0;

      for (let i = 0; i < pollsSnapshot.docs.length; i += batchSize) {
        const batch = firestore.batch();
        const chunk = pollsSnapshot.docs.slice(i, i + batchSize);

        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += chunk.length;
      }

      console.log(`Cleaned up ${deletedCount} expired availability polls`);
      return null;
    } catch (error) {
      console.error('Error cleaning up availability polls:', error);
      throw error;
    }
  });
