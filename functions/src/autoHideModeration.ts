import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

/**
 * Firestore trigger: Check if a card has received 5+ reports in the last 24 hours
 * and automatically hide it if so.
 */
export const onReportCreated = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snapshot, context) => {
    try {
      const report = snapshot.data();
      const cardId = report.cardId;

      if (!cardId) return;

      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

      // Query reports for this card in the last 24 hours
      const reportsSnapshot = await firestore
        .collection('reports')
        .where('cardId', '==', cardId)
        .where('timestamp', '>', twentyFourHoursAgo)
        .get();

      const reportCount = reportsSnapshot.size;
      console.log(`Card ${cardId} has ${reportCount} reports in last 24h.`);

      // If threshold reached, hide the card
      if (reportCount >= 5) {
        const cardRef = firestore.collection('public_circles').doc(cardId);
        const cardDoc = await cardRef.get();

        if (cardDoc.exists && !cardDoc.data()?.isHidden) {
          await cardRef.update({
            isHidden: true,
            hiddenReason: 'auto_reports',
            hiddenAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Auto-hid card ${cardId} due to exceeding report threshold.`);
        }
      }
    } catch (error) {
      console.error('Error in onReportCreated auto-hide:', error);
    }
  });
