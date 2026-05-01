import { doc, setDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { firestore, auth } from './firebase';

/**
 * Analytics Service
 * 
 * Tracks user events and promoted content performance
 */

/**
 * Track promoted card impression
 */
export const trackPromotedCardImpression = async (cardId: string): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid || 'anonymous';

    // Log impression
    await setDoc(
      doc(firestore, `analytics/promotedCards/impressions/${cardId}_${userId}_${Date.now()}`),
      {
        cardId,
        userId,
        timestamp: serverTimestamp(),
        type: 'impression',
      }
    );

    // Increment impression count
    await updateDoc(doc(firestore, `promotedCards/${cardId}`), {
      impressions: increment(1),
    });

    console.log('Promoted card impression tracked:', cardId);
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
};

/**
 * Track promoted card click
 */
export const trackPromotedCardClick = async (
  cardId: string,
  ctaUrl: string
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid || 'anonymous';

    // Log click
    await setDoc(
      doc(firestore, `analytics/promotedCards/clicks/${cardId}_${userId}_${Date.now()}`),
      {
        cardId,
        userId,
        ctaUrl,
        timestamp: serverTimestamp(),
        type: 'click',
      }
    );

    // Increment click count
    await updateDoc(doc(firestore, `promotedCards/${cardId}`), {
      clicks: increment(1),
    });

    console.log('Promoted card click tracked:', cardId);
  } catch (error) {
    console.error('Error tracking click:', error);
  }
};

/**
 * Track affiliate link click
 */
export const trackAffiliateClick = async (
  circleId: string,
  transitMode: string,
  transitRoute: string,
  transitDate: string,
  userId: string
): Promise<void> => {
  try {
    // Log affiliate click
    await setDoc(
      doc(firestore, `analytics/affiliateClicks/${circleId}_${userId}_${Date.now()}`),
      {
        circleId,
        userId,
        transitMode,
        transitRoute,
        transitDate,
        timestamp: serverTimestamp(),
      }
    );

    console.log('Affiliate click tracked:', circleId);
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
  }
};

/**
 * Track circle creation
 */
export const trackCircleCreation = async (
  circleId: string,
  circleType: 'private' | 'open',
  category?: string
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(doc(firestore, `analytics/circleCreations/${circleId}`), {
      circleId,
      userId,
      circleType,
      category,
      timestamp: serverTimestamp(),
    });

    console.log('Circle creation tracked:', circleId);
  } catch (error) {
    console.error('Error tracking circle creation:', error);
  }
};

/**
 * Track plan creation
 */
export const trackPlanCreation = async (
  planId: string,
  planType: string,
  circleId: string
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(doc(firestore, `analytics/planCreations/${planId}`), {
      planId,
      userId,
      planType,
      circleId,
      timestamp: serverTimestamp(),
    });

    console.log('Plan creation tracked:', planId);
  } catch (error) {
    console.error('Error tracking plan creation:', error);
  }
};

/**
 * Track RSVP
 */
export const trackRSVP = async (
  planId: string,
  response: 'going' | 'maybe' | 'cant_make_it'
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(doc(firestore, `analytics/rsvps/${planId}_${userId}`), {
      planId,
      userId,
      response,
      timestamp: serverTimestamp(),
    });

    console.log('RSVP tracked:', planId, response);
  } catch (error) {
    console.error('Error tracking RSVP:', error);
  }
};

/**
 * Track message sent
 */
export const trackMessageSent = async (
  circleId: string,
  messageType: 'text' | 'image' | 'gif' | 'poll' | 'plan'
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(
      doc(firestore, `analytics/messages/${circleId}_${userId}_${Date.now()}`),
      {
        circleId,
        userId,
        messageType,
        timestamp: serverTimestamp(),
      }
    );

    console.log('Message sent tracked:', circleId, messageType);
  } catch (error) {
    console.error('Error tracking message:', error);
  }
};

/**
 * Track subscription purchase
 */
export const trackSubscriptionPurchase = async (
  packageType: 'monthly' | 'annual',
  price: number
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(
      doc(firestore, `analytics/subscriptions/${userId}_${Date.now()}`),
      {
        userId,
        packageType,
        price,
        timestamp: serverTimestamp(),
      }
    );

    console.log('Subscription purchase tracked:', packageType);
  } catch (error) {
    console.error('Error tracking subscription:', error);
  }
};

/**
 * Track app open
 */
export const trackAppOpen = async (): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid || 'anonymous';

    await setDoc(
      doc(firestore, `analytics/appOpens/${userId}_${Date.now()}`),
      {
        userId,
        timestamp: serverTimestamp(),
      }
    );

    console.log('App open tracked');
  } catch (error) {
    console.error('Error tracking app open:', error);
  }
};

/**
 * Track screen view
 */
export const trackScreenView = async (screenName: string): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid || 'anonymous';

    await setDoc(
      doc(firestore, `analytics/screenViews/${userId}_${screenName}_${Date.now()}`),
      {
        userId,
        screenName,
        timestamp: serverTimestamp(),
      }
    );

    console.log('Screen view tracked:', screenName);
  } catch (error) {
    console.error('Error tracking screen view:', error);
  }
};
