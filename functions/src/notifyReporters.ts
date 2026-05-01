import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const messaging = admin.messaging();

/**
 * HTTP Callable Function to notify reporters of moderation outcome
 * 
 * Called by admin when reviewing reported content
 */
export const notifyReporters = functions.https.onCall(
  async (data, context) => {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to call this function'
      );
    }

    // Optional: Verify user is admin
    // const userDoc = await firestore.collection('users').doc(context.auth.uid).get();
    // if (!userDoc.data()?.isAdmin) {
    //   throw new functions.https.HttpsError('permission-denied', 'User must be admin');
    // }

    const { cardId, outcome, circleName } = data;

    if (!cardId || !outcome || !circleName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: cardId, outcome, circleName'
      );
    }

    try {
      // Get all reports for this card
      const reportsSnapshot = await firestore
        .collection('reports')
        .where('cardId', '==', cardId)
        .get();

      if (reportsSnapshot.empty) {
        return {
          success: true,
          message: 'No reports found for this card',
          notifiedCount: 0,
        };
      }

      // Get unique reporter UIDs
      const reporterUids = new Set<string>();
      reportsSnapshot.forEach((doc) => {
        const report = doc.data();
        reporterUids.add(report.reporterUid);
      });

      // Prepare notification message based on outcome
      let notificationTitle = 'Report Update';
      let notificationBody = '';

      switch (outcome) {
        case 'approved':
          notificationTitle = 'Report Reviewed';
          notificationBody = `We reviewed your report about "${circleName}". After investigation, we found it doesn't violate our guidelines.`;
          break;
        case 'removed':
          notificationTitle = 'Action Taken';
          notificationBody = `Thank you for reporting "${circleName}". We've removed it for violating our guidelines.`;
          break;
        case 'warned':
          notificationTitle = 'Action Taken';
          notificationBody = `Thank you for reporting "${circleName}". We've warned the creator about our guidelines.`;
          break;
        case 'suspended':
          notificationTitle = 'Action Taken';
          notificationBody = `Thank you for reporting "${circleName}". We've suspended the creator for violating our guidelines.`;
          break;
        default:
          notificationTitle = 'Report Update';
          notificationBody = `Your report about "${circleName}" has been reviewed.`;
      }

      // Send notifications to all reporters
      const notificationPromises = Array.from(reporterUids).map(async (reporterUid) => {
        try {
          // 1. Write to in-app notifications collection
          await firestore
            .collection(`users/${reporterUid}/notifications`)
            .add({
              type: 'report_outcome',
              title: notificationTitle,
              body: notificationBody,
              cardId,
              circleName,
              outcome,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

          // 2. Get user's FCM token
          const userDoc = await firestore.collection('users').doc(reporterUid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const fcmToken = userData?.fcmToken;

            if (fcmToken) {
              // 3. Send FCM push notification
              await messaging.send({
                token: fcmToken,
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                },
                data: {
                  type: 'report_outcome',
                  cardId,
                  circleName,
                  outcome,
                },
                android: {
                  priority: 'high',
                  notification: {
                    channelId: 'reports',
                    priority: 'high',
                  },
                },
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                      badge: 1,
                    },
                  },
                },
              });

              console.log(`Sent FCM notification to reporter ${reporterUid}`);
            } else {
              console.log(`No FCM token for reporter ${reporterUid}`);
            }
          }

          return { success: true, reporterUid };
        } catch (error) {
          console.error(`Error notifying reporter ${reporterUid}:`, error);
          return { success: false, reporterUid, error: error.message };
        }
      });

      const results = await Promise.allSettled(notificationPromises);
      
      const successCount = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;

      console.log(`Notified ${successCount}/${reporterUids.size} reporters about outcome: ${outcome}`);

      return {
        success: true,
        message: `Notified ${successCount} out of ${reporterUids.size} reporters`,
        notifiedCount: successCount,
        totalReporters: reporterUids.size,
      };
    } catch (error) {
      console.error('Error in notifyReporters function:', error);
      throw new functions.https.HttpsError('internal', 'Failed to notify reporters');
    }
  }
);

/**
 * Firestore Trigger: Auto-notify reporters when report status changes
 * 
 * Triggers when a report document is updated with a new status
 */
export const onReportStatusChange = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if status changed from 'pending' to 'reviewed' or 'dismissed'
    if (
      beforeData.status === 'pending' &&
      (afterData.status === 'reviewed' || afterData.status === 'dismissed')
    ) {
      const { cardId, reporterUid } = afterData;

      try {
        // Get circle name
        const cardDoc = await firestore.collection('public_circles').doc(cardId).get();
        
        if (!cardDoc.exists) {
          console.log('Card not found:', cardId);
          return null;
        }

        const cardData = cardDoc.data();
        const circleName = cardData?.name || 'Unknown Circle';
        const isHidden = cardData?.isHidden || false;

        // Determine outcome
        let outcome: string;
        if (afterData.status === 'dismissed') {
          outcome = 'approved'; // Report was dismissed, card is approved
        } else if (isHidden) {
          outcome = 'removed'; // Card was hidden/removed
        } else {
          outcome = 'warned'; // Card is still visible but reviewed
        }

        // Prepare notification
        let notificationTitle = 'Report Update';
        let notificationBody = '';

        switch (outcome) {
          case 'approved':
            notificationTitle = 'Report Reviewed';
            notificationBody = `We reviewed your report about "${circleName}". After investigation, we found it doesn't violate our guidelines.`;
            break;
          case 'removed':
            notificationTitle = 'Action Taken';
            notificationBody = `Thank you for reporting "${circleName}". We've removed it for violating our guidelines.`;
            break;
          case 'warned':
            notificationTitle = 'Action Taken';
            notificationBody = `Thank you for reporting "${circleName}". We've warned the creator about our guidelines.`;
            break;
        }

        // Write to in-app notifications
        await firestore
          .collection(`users/${reporterUid}/notifications`)
          .add({
            type: 'report_outcome',
            title: notificationTitle,
            body: notificationBody,
            cardId,
            circleName,
            outcome,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });

        // Get user's FCM token and send push notification
        const userDoc = await firestore.collection('users').doc(reporterUid).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const fcmToken = userData?.fcmToken;

          if (fcmToken) {
            await messaging.send({
              token: fcmToken,
              notification: {
                title: notificationTitle,
                body: notificationBody,
              },
              data: {
                type: 'report_outcome',
                cardId,
                circleName,
                outcome,
              },
              android: {
                priority: 'high',
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                  },
                },
              },
            });

            console.log(`Sent notification to reporter ${reporterUid} for report ${context.params.reportId}`);
          }
        }

        return null;
      } catch (error) {
        console.error('Error in onReportStatusChange:', error);
        return null;
      }
    }

    return null;
  });
