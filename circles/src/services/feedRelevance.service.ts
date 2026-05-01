import { doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { OpenCircle, UserPreferences } from '../types/feed.types';

/**
 * Feed Relevance Service
 * 
 * Implements the 4-factor relevance algorithm:
 * 1. Location Proximity
 * 2. Travel Context
 * 3. Join Velocity
 * 4. Category Affinity
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate location proximity score (0-1)
 * Circles within 10km get 1.0, 50km get 0.5, 100km+ get 0
 */
export const calculateLocationScore = (
  circle: OpenCircle,
  userLocation?: { latitude: number; longitude: number }
): number => {
  if (!circle.geoLocation || !userLocation) return 0;

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    circle.geoLocation.latitude,
    circle.geoLocation.longitude
  );

  // Scoring curve
  if (distance <= 10) return 1.0;
  if (distance <= 25) return 0.8;
  if (distance <= 50) return 0.5;
  if (distance <= 100) return 0.2;
  return 0;
};

/**
 * Calculate join velocity score (0-1)
 * Circles with 10+ joins in 24h get 1.0, 5+ get 0.7, 2+ get 0.4
 */
export const calculateJoinVelocityScore = (circle: OpenCircle): number => {
  // Use pre-calculated joinVelocity if available
  if (circle.joinVelocity !== undefined) {
    const velocity = circle.joinVelocity;
    if (velocity >= 10) return 1.0;
    if (velocity >= 5) return 0.7;
    if (velocity >= 2) return 0.4;
    return 0;
  }

  // Fallback: calculate from memberJoinTimestamps
  if (!circle.memberJoinTimestamps || circle.memberJoinTimestamps.length === 0) {
    return 0;
  }

  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentJoins = circle.memberJoinTimestamps.filter(
    (join) => join.timestamp > twentyFourHoursAgo
  );

  const velocity = recentJoins.length;
  if (velocity >= 10) return 1.0;
  if (velocity >= 5) return 0.7;
  if (velocity >= 2) return 0.4;
  return 0;
};

/**
 * Calculate category affinity score (0-1)
 * Based on user's past circle joins
 */
export const calculateCategoryAffinityScore = (
  circle: OpenCircle,
  userPreferences?: UserPreferences
): number => {
  if (!userPreferences || !userPreferences.categoryAffinity) return 0;

  const affinity = userPreferences.categoryAffinity[circle.category] || 0;
  
  // Normalize to 0-1 range (assuming max affinity is 1.0)
  return Math.min(affinity, 1.0);
};

/**
 * Calculate travel context score (0-1)
 * Boost circles matching user's recent transit searches
 */
export const calculateTravelContextScore = (
  circle: OpenCircle,
  userPreferences?: UserPreferences
): number => {
  if (!circle.transitRoute || !circle.transitDate) return 0;
  if (!userPreferences || !userPreferences.recentSearches) return 0;

  // Check if circle matches any recent search (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSearches = userPreferences.recentSearches.filter(
    (search) => search.timestamp > sevenDaysAgo
  );

  const hasMatch = recentSearches.some(
    (search) =>
      search.transitRoute.toLowerCase() === circle.transitRoute?.toLowerCase() &&
      search.transitDate === circle.transitDate
  );

  return hasMatch ? 1.0 : 0;
};

/**
 * Calculate recency score (0-1)
 * Newer circles get higher scores, with decay over 7 days
 */
export const calculateRecencyScore = (circle: OpenCircle): number => {
  const ageInHours = (Date.now() - circle.createdAt) / (1000 * 60 * 60);
  const ageInDays = ageInHours / 24;

  // Decay over 7 days
  if (ageInDays <= 1) return 1.0;
  if (ageInDays <= 3) return 0.8;
  if (ageInDays <= 7) return 0.5;
  if (ageInDays <= 14) return 0.2;
  return 0.1; // Very old circles still get small score
};

/**
 * Calculate composite relevance score
 * Combines all 4 factors with configurable weights
 */
export const calculateRelevanceScore = (
  circle: OpenCircle,
  userLocation?: { latitude: number; longitude: number },
  userPreferences?: UserPreferences,
  weights?: {
    recency?: number;
    location?: number;
    velocity?: number;
    affinity?: number;
    travel?: number;
  }
): number => {
  // Default weights (sum to 1.0)
  const defaultWeights = {
    recency: 0.2,
    location: 0.25,
    velocity: 0.2,
    affinity: 0.2,
    travel: 0.15,
  };

  const w = { ...defaultWeights, ...weights };

  // Calculate individual scores
  const recencyScore = calculateRecencyScore(circle);
  const locationScore = calculateLocationScore(circle, userLocation);
  const velocityScore = calculateJoinVelocityScore(circle);
  const affinityScore = calculateCategoryAffinityScore(circle, userPreferences);
  const travelScore = calculateTravelContextScore(circle, userPreferences);

  // Weighted composite score
  const compositeScore =
    recencyScore * w.recency +
    locationScore * w.location +
    velocityScore * w.velocity +
    affinityScore * w.affinity +
    travelScore * w.travel;

  return compositeScore;
};

/**
 * Sort circles by relevance score
 */
export const sortCirclesByRelevance = (
  circles: OpenCircle[],
  userLocation?: { latitude: number; longitude: number },
  userPreferences?: UserPreferences
): OpenCircle[] => {
  return circles
    .map((circle) => ({
      circle,
      score: calculateRelevanceScore(circle, userLocation, userPreferences),
    }))
    .sort((a, b) => b.score - a.score) // Descending order
    .map((item) => item.circle);
};

/**
 * Get user preferences from Firestore
 */
export const getUserPreferences = async (
  userId: string
): Promise<UserPreferences | null> => {
  try {
    const prefsRef = doc(firestore, `userPreferences/${userId}`);
    const prefsDoc = await getDoc(prefsRef);

    if (prefsDoc.exists()) {
      return prefsDoc.data() as UserPreferences;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
};

/**
 * Calculate join velocity for a circle (to be called periodically)
 * This should ideally run as a Cloud Function every hour
 */
export const calculateJoinVelocity = (circle: OpenCircle): number => {
  if (!circle.memberJoinTimestamps || circle.memberJoinTimestamps.length === 0) {
    return 0;
  }

  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentJoins = circle.memberJoinTimestamps.filter(
    (join) => join.timestamp > twentyFourHoursAgo
  );

  return recentJoins.length;
};
