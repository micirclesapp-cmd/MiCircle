import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from './firebase';

/**
 * Circle Service
 * 
 * Handles circle-related operations including reporting
 */

export interface ReportData {
  cardId: string;
  reason: string;
  reporterUid: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'dismissed';
}

/**
 * Report a circle card
 * 
 * @param cardId - The ID of the circle card to report
 * @param reason - The reason for reporting (spam, inappropriate, misleading, harassment)
 * @param reporterUid - The UID of the user reporting
 * @returns Promise that resolves when report is submitted
 */
export const reportCard = async (
  cardId: string,
  reason: string,
  reporterUid: string
): Promise<void> => {
  try {
    // 1. Write report to Firestore
    const reportsRef = collection(firestore, 'reports');
    await addDoc(reportsRef, {
      cardId,
      reason,
      reporterUid,
      timestamp: Date.now(),
      status: 'pending',
    });

    // 2. Count reports for this card in the last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentReportsQuery = query(
      reportsRef,
      where('cardId', '==', cardId),
      where('timestamp', '>', twentyFourHoursAgo)
    );

    const recentReportsSnapshot = await getDocs(recentReportsQuery);
    const reportCount = recentReportsSnapshot.size;

    console.log(`Card ${cardId} has ${reportCount} reports in last 24h`);

    // 3. If count >= 5, auto-hide the card
    if (reportCount >= 5) {
      const cardRef = doc(firestore, 'public_circles', cardId);
      await updateDoc(cardRef, {
        isHidden: true,
        hiddenReason: 'auto_reports',
        hiddenAt: serverTimestamp(),
      });

      console.log(`Card ${cardId} auto-hidden due to ${reportCount} reports`);
    }
  } catch (error) {
    console.error('Error reporting card:', error);
    throw error;
  }
};

/**
 * Check if a user has already reported a card
 * 
 * @param cardId - The ID of the circle card
 * @param reporterUid - The UID of the user
 * @returns Promise that resolves to true if user has already reported
 */
export const hasUserReportedCard = async (
  cardId: string,
  reporterUid: string
): Promise<boolean> => {
  try {
    const reportsRef = collection(firestore, 'reports');
    const userReportsQuery = query(
      reportsRef,
      where('cardId', '==', cardId),
      where('reporterUid', '==', reporterUid)
    );

    const userReportsSnapshot = await getDocs(userReportsQuery);
    return !userReportsSnapshot.empty;
  } catch (error) {
    console.error('Error checking user reports:', error);
    return false;
  }
};

/**
 * Get report count for a card in the last 24 hours
 * 
 * @param cardId - The ID of the circle card
 * @returns Promise that resolves to the report count
 */
export const getReportCount = async (cardId: string): Promise<number> => {
  try {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const reportsRef = collection(firestore, 'reports');
    const recentReportsQuery = query(
      reportsRef,
      where('cardId', '==', cardId),
      where('timestamp', '>', twentyFourHoursAgo)
    );

    const recentReportsSnapshot = await getDocs(recentReportsQuery);
    return recentReportsSnapshot.size;
  } catch (error) {
    console.error('Error getting report count:', error);
    return 0;
  }
};

/**
 * Get all reports for a card
 * 
 * @param cardId - The ID of the circle card
 * @returns Promise that resolves to array of reports
 */
export const getCardReports = async (cardId: string): Promise<ReportData[]> => {
  try {
    const reportsRef = collection(firestore, 'reports');
    const cardReportsQuery = query(
      reportsRef,
      where('cardId', '==', cardId)
    );

    const cardReportsSnapshot = await getDocs(cardReportsQuery);
    const reports: ReportData[] = [];

    cardReportsSnapshot.forEach((doc) => {
      reports.push(doc.data() as ReportData);
    });

    return reports;
  } catch (error) {
    console.error('Error getting card reports:', error);
    return [];
  }
};

/**
 * Unhide a card (admin function)
 * 
 * @param cardId - The ID of the circle card
 * @returns Promise that resolves when card is unhidden
 */
export const unhideCard = async (cardId: string): Promise<void> => {
  try {
    const cardRef = doc(firestore, 'public_circles', cardId);
    await updateDoc(cardRef, {
      isHidden: false,
      hiddenReason: null,
      hiddenAt: null,
      reviewedAt: serverTimestamp(),
    });

    console.log(`Card ${cardId} unhidden`);
  } catch (error) {
    console.error('Error unhiding card:', error);
    throw error;
  }
};

/**
 * Mark reports as reviewed (admin function)
 * 
 * @param cardId - The ID of the circle card
 * @param status - The new status ('reviewed' or 'dismissed')
 * @returns Promise that resolves when reports are updated
 */
export const updateReportStatus = async (
  cardId: string,
  status: 'reviewed' | 'dismissed'
): Promise<void> => {
  try {
    const reportsRef = collection(firestore, 'reports');
    const cardReportsQuery = query(
      reportsRef,
      where('cardId', '==', cardId),
      where('status', '==', 'pending')
    );

    const cardReportsSnapshot = await getDocs(cardReportsQuery);

    // Update all pending reports for this card
    const updatePromises = cardReportsSnapshot.docs.map((reportDoc) =>
      updateDoc(reportDoc.ref, {
        status,
        reviewedAt: serverTimestamp(),
      })
    );

    await Promise.all(updatePromises);

    console.log(`Updated ${cardReportsSnapshot.size} reports for card ${cardId} to ${status}`);
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
};

/**
 * Notify reporters of moderation outcome
 * 
 * @param cardId - The ID of the circle card
 * @param outcome - The moderation outcome ('approved', 'removed', 'warned', 'suspended')
 * @param circleName - Name of the reported circle
 * @returns Promise that resolves when notifications are sent
 */
export const notifyReporters = async (
  cardId: string,
  outcome: 'approved' | 'removed' | 'warned' | 'suspended',
  circleName: string
): Promise<void> => {
  try {
    // Get all reports for this card
    const reportsRef = collection(firestore, 'reports');
    const cardReportsQuery = query(
      reportsRef,
      where('cardId', '==', cardId)
    );

    const cardReportsSnapshot = await getDocs(cardReportsQuery);

    if (cardReportsSnapshot.empty) {
      console.log('No reports found for card:', cardId);
      return;
    }

    // Get unique reporter UIDs
    const reporterUids = new Set<string>();
    cardReportsSnapshot.forEach((doc) => {
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
    }

    // Send in-app notification to each reporter
    const notificationPromises = Array.from(reporterUids).map(async (reporterUid) => {
      try {
        // Write to in-app notifications collection
        const notificationsRef = collection(firestore, `users/${reporterUid}/notifications`);
        await addDoc(notificationsRef, {
          type: 'report_outcome',
          title: notificationTitle,
          body: notificationBody,
          cardId,
          circleName,
          outcome,
          timestamp: Date.now(),
          read: false,
        });

        // Also try to send FCM push notification
        const userDoc = await getDoc(doc(firestore, 'users', reporterUid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fcmToken = userData?.fcmToken;

          if (fcmToken) {
            // Note: This requires Firebase Admin SDK in Cloud Functions
            // For now, we'll just log it
            console.log(`Would send FCM to ${reporterUid}:`, notificationTitle);
            
            // TODO: Call Cloud Function to send FCM
            // await callCloudFunction('sendReporterNotification', {
            //   fcmToken,
            //   title: notificationTitle,
            //   body: notificationBody,
            // });
          }
        }
      } catch (error) {
        console.error(`Error notifying reporter ${reporterUid}:`, error);
        // Continue with other reporters even if one fails
      }
    });

    await Promise.allSettled(notificationPromises);

    console.log(`Notified ${reporterUids.size} reporters about outcome: ${outcome}`);
  } catch (error) {
    console.error('Error notifying reporters:', error);
    throw error;
  }
};

/**
 * Check for duplicate circles
 * Prevents same user from posting near-identical content within 24 hours
 * 
 * @param uid - User ID
 * @param name - Circle name
 * @param pitch - Circle pitch
 * @param tags - Circle tags
 * @returns Promise that resolves to { isDuplicate: boolean, reason?: string }
 */
export const checkDuplicateCircle = async (
  uid: string,
  name: string,
  pitch: string,
  tags: string[]
): Promise<{ isDuplicate: boolean; reason?: string }> => {
  try {
    // Import similarity function
    const { calculateSimilarity } = await import('./moderation.service');

    // Get user's circles from last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const circlesRef = collection(firestore, 'public_circles');
    const userCirclesQuery = query(
      circlesRef,
      where('creatorUid', '==', uid),
      where('createdAt', '>', twentyFourHoursAgo)
    );

    const userCirclesSnapshot = await getDocs(userCirclesQuery);

    if (userCirclesSnapshot.empty) {
      return { isDuplicate: false };
    }

    // Check similarity with each recent circle
    for (const doc of userCirclesSnapshot.docs) {
      const circle = doc.data();
      
      // Calculate similarity scores
      const nameSimilarity = calculateSimilarity(name, circle.name);
      const pitchSimilarity = calculateSimilarity(pitch, circle.pitch);
      
      // Check tag overlap
      const circleTags = circle.tags || [];
      const tagOverlap = tags.filter((tag) => circleTags.includes(tag)).length;
      const tagSimilarity = tags.length > 0 ? tagOverlap / tags.length : 0;

      // Consider duplicate if:
      // - Name is 80%+ similar AND pitch is 70%+ similar
      // - OR name is 90%+ similar AND tags are 70%+ similar
      const isDuplicate =
        (nameSimilarity >= 0.8 && pitchSimilarity >= 0.7) ||
        (nameSimilarity >= 0.9 && tagSimilarity >= 0.7);

      if (isDuplicate) {
        return {
          isDuplicate: true,
          reason: `You posted a similar circle "${circle.name}" recently. Please wait 24 hours before posting similar content.`,
        };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicate circle:', error);
    // Fail open - don't block if check fails
    return { isDuplicate: false };
  }
};

/**
 * Check spam throttle
 * Limits user to 3 open circles per 24 hours
 * 
 * @param uid - User ID
 * @returns Promise that resolves to { isThrottled: boolean, count?: number, reason?: string }
 */
export const checkSpamThrottle = async (
  uid: string
): Promise<{ isThrottled: boolean; count?: number; reason?: string }> => {
  try {
    // Get user's circles from last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const circlesRef = collection(firestore, 'public_circles');
    const userCirclesQuery = query(
      circlesRef,
      where('creatorUid', '==', uid),
      where('createdAt', '>', twentyFourHoursAgo)
    );

    const userCirclesSnapshot = await getDocs(userCirclesQuery);
    const count = userCirclesSnapshot.size;

    if (count >= 3) {
      // Find oldest circle to calculate when user can post again
      let oldestTimestamp = Date.now();
      userCirclesSnapshot.forEach((doc) => {
        const circle = doc.data();
        if (circle.createdAt < oldestTimestamp) {
          oldestTimestamp = circle.createdAt;
        }
      });

      const canPostAgainAt = oldestTimestamp + 24 * 60 * 60 * 1000;
      const hoursRemaining = Math.ceil((canPostAgainAt - Date.now()) / (1000 * 60 * 60));

      return {
        isThrottled: true,
        count,
        reason: `You've reached the limit of 3 circles per 24 hours. You can post again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.`,
      };
    }

    return { isThrottled: false, count };
  } catch (error) {
    console.error('Error checking spam throttle:', error);
    // Fail open - don't block if check fails
    return { isThrottled: false };
  }
};

/**
 * Check bot detection
 * Accounts less than 24 hours old cannot post without email verification
 * 
 * @param uid - User ID
 * @returns Promise that resolves to { isBot: boolean, reason?: string }
 */
export const checkBotDetection = async (
  uid: string
): Promise<{ isBot: boolean; reason?: string; needsVerification?: boolean }> => {
  try {
    const { auth } = await import('./firebase');
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return { isBot: true, reason: 'User not authenticated' };
    }

    // Get user account creation time from Firebase Auth
    const accountCreatedAt = currentUser.metadata.creationTime;
    
    if (!accountCreatedAt) {
      // If we can't determine account age, fail open
      return { isBot: false };
    }

    const accountAge = Date.now() - new Date(accountCreatedAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // If account is less than 24 hours old
    if (accountAge < twentyFourHours) {
      // Check if email is verified
      if (!currentUser.emailVerified) {
        const hoursOld = Math.floor(accountAge / (1000 * 60 * 60));
        const hoursRemaining = Math.ceil((twentyFourHours - accountAge) / (1000 * 60 * 60));

        return {
          isBot: true,
          needsVerification: true,
          reason: `New accounts must verify their email before posting. Your account is ${hoursOld} hour${hoursOld !== 1 ? 's' : ''} old. Please verify your email or wait ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
        };
      }
    }

    return { isBot: false };
  } catch (error) {
    console.error('Error checking bot detection:', error);
    // Fail open - don't block if check fails
    return { isBot: false };
  }
};
