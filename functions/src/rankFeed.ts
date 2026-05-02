import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

/**
 * Scheduled function to calculate and update rankScore for open circles
 * Runs every 15 minutes
 */
export const rankFeed = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    try {
      const circlesRef = firestore.collection('public_circles');
      const activeCircles = await circlesRef
        .where('isArchived', '==', false)
        .where('isHidden', '==', false)
        .get();

      if (activeCircles.empty) {
        console.log('No active public circles to rank.');
        return null;
      }

      const batch = firestore.batch();
      const now = Date.now();
      let updatedCount = 0;

      activeCircles.forEach((doc) => {
        const circle = doc.data();
        
        // Base score calculation based on recency and members
        const createdAt = circle.createdAt?.toMillis?.() || circle.createdAt || now;
        const ageInHours = (now - createdAt) / (1000 * 60 * 60);
        
        // Decay factor: newer circles get higher scores, older circles decay
        const recencyScore = Math.max(100 - ageInHours, 0); 
        
        // Engagement factor: 10 points per member
        const memberCount = Array.isArray(circle.members) ? circle.members.length : 1;
        const engagementScore = memberCount * 10;
        
        // Base score
        let rankScore = recencyScore + engagementScore;
        
        // Add random jitter to prevent static feeds (between -5 and +5)
        const jitter = Math.floor(Math.random() * 11) - 5;
        rankScore += jitter;
        
        batch.update(doc.ref, { 
          rankScore, 
          lastRankedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
        updatedCount++;
      });

      await batch.commit();
      console.log(`Successfully ranked ${updatedCount} public circles.`);
      return null;
    } catch (error) {
      console.error('Error ranking feed:', error);
      throw error;
    }
  });
