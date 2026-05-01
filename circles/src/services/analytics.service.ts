import { doc, setDoc, serverTimestamp, increment, updateDoc, arrayUnion } from 'firebase/firestore';
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
 * Track video call started
 */
export const trackVideoCallStarted = async (
  circleId: string,
  participantCount: number
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(
      doc(firestore, `analytics/videoCalls/${circleId}_${Date.now()}`),
      {
        circleId,
        userId,
        participantCount,
        timestamp: serverTimestamp(),
      }
    );

    console.log('Video call tracked:', circleId);
  } catch (error) {
    console.error('Error tracking video call:', error);
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

/**
 * Track circle join (for category affinity)
 */
export const trackCircleJoin = async (
  circleId: string,
  circleType: 'private' | 'open',
  category: string
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(
      doc(firestore, `analytics/circleJoins/${circleId}_${userId}`),
      {
        circleId,
        userId,
        circleType,
        category,
        timestamp: serverTimestamp(),
      }
    );

    // Update user preferences
    await updateUserCategoryAffinity(userId, category);

    console.log('Circle join tracked:', circleId, category);
  } catch (error) {
    console.error('Error tracking circle join:', error);
  }
};

/**
 * Update user category affinity
 */
const updateUserCategoryAffinity = async (
  userId: string,
  category: string
): Promise<void> => {
  try {
    const prefsRef = doc(firestore, `userPreferences/${userId}`);
    
    // Increment category affinity score
    await updateDoc(prefsRef, {
      [`categoryAffinity.${category}`]: increment(0.1),
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      await setDoc(prefsRef, {
        uid: userId,
        categoryAffinity: {
          travel: category === 'travel' ? 0.1 : 0,
          fitness: category === 'fitness' ? 0.1 : 0,
          music: category === 'music' ? 0.1 : 0,
          food: category === 'food' ? 0.1 : 0,
          hobby: category === 'hobby' ? 0.1 : 0,
          neighbourhood: category === 'neighbourhood' ? 0.1 : 0,
          professional: category === 'professional' ? 0.1 : 0,
          other: category === 'other' ? 0.1 : 0,
        },
        lastUpdated: serverTimestamp(),
      });
    }
  }
};

/**
 * Track transit search (for travel context)
 */
export const trackTransitSearch = async (
  transitRoute: string,
  transitDate: string
): Promise<void> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await setDoc(
      doc(firestore, `analytics/transitSearches/${userId}_${Date.now()}`),
      {
        userId,
        transitRoute,
        transitDate,
        timestamp: serverTimestamp(),
      }
    );

    // Update user preferences with recent search
    const prefsRef = doc(firestore, `userPreferences/${userId}`);
    await updateDoc(prefsRef, {
      recentSearches: arrayUnion({
        transitRoute,
        transitDate,
        timestamp: Date.now(),
      }),
      lastUpdated: serverTimestamp(),
    });

    console.log('Transit search tracked:', transitRoute, transitDate);
  } catch (error) {
    console.error('Error tracking transit search:', error);
  }
};
