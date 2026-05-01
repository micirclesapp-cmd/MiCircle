# Feed Relevance Algorithm - Implementation Guide

**Status**: ✅ **FULLY IMPLEMENTED**

**Date**: April 30, 2026

---

## Overview

The Open Discovery Feed uses a 4-factor relevance algorithm to personalize the feed for each user. This document explains how the algorithm works and how to use it.

---

## The 4 Relevance Factors

### 1. **Location Proximity** (Weight: 0.25)

**What it does**: Boosts circles that are geographically close to the user.

**How it works**:
- Requests GPS location permission on app open
- Calculates distance using Haversine formula
- Scoring:
  - Within 10km: 1.0 (full boost)
  - Within 25km: 0.8
  - Within 50km: 0.5
  - Within 100km: 0.2
  - Beyond 100km: 0 (no boost)

**Implementation**:
- `useLocation()` hook requests location permission
- `calculateLocationScore()` in `feedRelevance.service.ts`
- Circles must have `geoLocation` field (added during creation via geocoding)

**Files**:
- `circles/src/hooks/useLocation.ts`
- `circles/src/services/feedRelevance.service.ts`

---

### 2. **Travel Context** (Weight: 0.15)

**What it does**: Boosts transit circles matching the user's recent searches.

**How it works**:
- Tracks transit searches (route + date) in user preferences
- Checks if circle matches any search from last 7 days
- Scoring:
  - Exact match: 1.0
  - No match: 0

**Implementation**:
- `trackTransitSearch()` saves searches to `userPreferences/recentSearches`
- `calculateTravelContextScore()` checks for matches
- Transit search UI in `TransitSearchBar.tsx`

**Files**:
- `circles/src/services/analytics.service.ts` (trackTransitSearch)
- `circles/src/services/feedRelevance.service.ts` (calculateTravelContextScore)
- `circles/src/components/feed/TransitSearchBar.tsx`

---

### 3. **Join Velocity** (Weight: 0.20)

**What it does**: Boosts "trending" circles that are gaining members quickly.

**How it works**:
- Tracks when each member joins (timestamp)
- Counts joins in last 24 hours
- Scoring:
  - 10+ joins: 1.0 (viral)
  - 5-9 joins: 0.7 (trending)
  - 2-4 joins: 0.4 (growing)
  - 0-1 joins: 0 (stable)

**Implementation**:
- `memberJoinTimestamps` array stores `{ uid, timestamp }` for each member
- `joinVelocity` field pre-calculated by Cloud Function (or client-side)
- `calculateJoinVelocityScore()` uses the pre-calculated value

**Files**:
- `circles/src/types/feed.types.ts` (OpenCircle interface)
- `circles/src/services/feedRelevance.service.ts` (calculateJoinVelocityScore)
- `circles/CLOUD_FUNCTION_JOIN_VELOCITY.md` (Cloud Function template)

**Cloud Function** (optional, for performance):
- Runs every hour to pre-calculate `joinVelocity` for all circles
- See `CLOUD_FUNCTION_JOIN_VELOCITY.md` for deployment instructions

---

### 4. **Category Affinity** (Weight: 0.20)

**What it does**: Boosts circles in categories the user has joined before.

**How it works**:
- Tracks every circle join with category
- Builds user preference profile: `{ travel: 0.3, fitness: 0.5, ... }`
- Each join increments category score by 0.1
- Scoring: Uses normalized affinity score (0-1)

**Implementation**:
- `trackCircleJoin()` increments category affinity in `userPreferences`
- `calculateCategoryAffinityScore()` reads user's affinity for circle's category
- Called when user joins any circle (open or private)

**Files**:
- `circles/src/services/analytics.service.ts` (trackCircleJoin)
- `circles/src/services/feedRelevance.service.ts` (calculateCategoryAffinityScore)
- `circles/src/types/feed.types.ts` (UserPreferences interface)

**Firestore Structure**:
```
userPreferences/{userId}
  - uid: string
  - categoryAffinity: {
      travel: 0.3,
      fitness: 0.5,
      music: 0.1,
      food: 0.2,
      hobby: 0,
      neighbourhood: 0,
      professional: 0,
      other: 0
    }
  - recentSearches: [{ transitRoute, transitDate, timestamp }]
  - currentLocation: { latitude, longitude, city }
  - lastUpdated: timestamp
```

---

## Composite Relevance Score

### Formula

```typescript
relevanceScore = 
  (recencyScore × 0.20) +
  (locationScore × 0.25) +
  (velocityScore × 0.20) +
  (affinityScore × 0.20) +
  (travelScore × 0.15)
```

### Recency Score (Weight: 0.20)

**What it does**: Prevents old circles from dominating the feed.

**Scoring**:
- 0-1 day old: 1.0
- 1-3 days old: 0.8
- 3-7 days old: 0.5
- 7-14 days old: 0.2
- 14+ days old: 0.1

This ensures fresh content while still showing older circles if they're highly relevant.

---

## Usage

### In FeedScreen

```typescript
import { sortCirclesByRelevance, getUserPreferences } from '../../services/feedRelevance.service';
import { useLocation } from '../../hooks/useLocation';

// Get user location
const { location } = useLocation();

// Get user preferences
const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

useEffect(() => {
  const loadPrefs = async () => {
    const prefs = await getUserPreferences(auth.currentUser?.uid);
    setUserPreferences(prefs);
  };
  loadPrefs();
}, []);

// Sort circles by relevance
const sortedCircles = sortCirclesByRelevance(
  fetchedCircles,
  location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
  userPreferences || undefined
);

setCircles(sortedCircles);
```

### Manual Filters Override

When user applies manual filters (category, transit search), relevance sorting is **disabled**:

```typescript
// Only apply relevance sorting if NOT using manual filters
if (!transitFilter && selectedCategory === 'all') {
  sortedCircles = sortCirclesByRelevance(fetchedCircles, location, userPreferences);
} else {
  // Use Firestore ordering (createdAt desc)
  sortedCircles = fetchedCircles;
}
```

**Rationale**: Manual filters are explicit user intent, so we respect that over algorithmic ranking.

---

## Data Requirements

### For Location Proximity

**Circle must have**:
```typescript
{
  geoLocation: {
    latitude: number,
    longitude: number
  }
}
```

**Added during circle creation** via geocoding:
```typescript
const geocoded = await Location.geocodeAsync(`${neighbourhood} ${city}`);
if (geocoded && geocoded.length > 0) {
  circleData.geoLocation = {
    latitude: geocoded[0].latitude,
    longitude: geocoded[0].longitude,
  };
}
```

### For Join Velocity

**Circle must have**:
```typescript
{
  memberJoinTimestamps: [
    { uid: 'user1', timestamp: 1714502400000 },
    { uid: 'user2', timestamp: 1714506000000 },
    ...
  ],
  joinVelocity: 5  // Pre-calculated (optional)
}
```

**Added when member joins**:
```typescript
await updateDoc(circleRef, {
  members: arrayUnion(userId),
  memberCount: increment(1),
  memberJoinTimestamps: arrayUnion({
    uid: userId,
    timestamp: Date.now(),
  }),
});
```

### For Category Affinity

**User must have**:
```typescript
userPreferences/{userId}
{
  categoryAffinity: {
    travel: 0.3,
    fitness: 0.5,
    ...
  }
}
```

**Updated when user joins circle**:
```typescript
await trackCircleJoin(circleId, 'open', circle.category);
```

### For Travel Context

**User must have**:
```typescript
userPreferences/{userId}
{
  recentSearches: [
    { transitRoute: '12163', transitDate: '2026-05-01', timestamp: 1714502400000 },
    ...
  ]
}
```

**Updated when user searches**:
```typescript
await trackTransitSearch(route, date);
```

---

## Performance Considerations

### Client-Side Sorting

**Current implementation**: Sorts circles client-side after fetching from Firestore.

**Pros**:
- Simple to implement
- No backend changes needed
- Works immediately

**Cons**:
- Calculates scores for all circles on every load
- Limited to sorting the fetched batch (20 circles)
- Cannot optimize Firestore queries

**Performance**: Acceptable for <100 circles per batch. Sorting 20 circles takes ~5-10ms.

### Server-Side Pre-Calculation (Future Optimization)

**Approach**: Cloud Function pre-calculates relevance scores and stores them in Firestore.

**Pros**:
- Faster feed loading
- Can optimize Firestore queries (orderBy relevanceScore)
- Scales to thousands of circles

**Cons**:
- More complex infrastructure
- Requires Cloud Functions
- Scores become stale (need periodic recalculation)

**When to implement**: If feed loading becomes slow (>2 seconds) or you have >1000 active circles.

---

## Testing

### Test Location Proximity

1. Create circles in different cities
2. Grant location permission
3. Verify nearby circles appear first

### Test Join Velocity

1. Create a circle
2. Have multiple users join within 1 hour
3. Verify circle appears higher in feed

### Test Category Affinity

1. Join several "fitness" circles
2. Create new "fitness" and "food" circles
3. Verify "fitness" circles rank higher

### Test Travel Context

1. Search for train "12163" on "2026-05-01"
2. Create matching transit circle
3. Verify circle appears at top of feed

---

## Tuning Weights

The default weights are:
```typescript
{
  recency: 0.20,
  location: 0.25,
  velocity: 0.20,
  affinity: 0.20,
  travel: 0.15,
}
```

**To adjust weights**, modify `calculateRelevanceScore()` in `feedRelevance.service.ts`:

```typescript
const weights = {
  recency: 0.15,    // Reduce recency importance
  location: 0.30,   // Increase location importance
  velocity: 0.25,   // Increase trending boost
  affinity: 0.20,   // Keep same
  travel: 0.10,     // Reduce travel boost
};
```

**Recommendation**: A/B test different weight combinations to optimize for user engagement.

---

## Monitoring

### Key Metrics to Track

1. **Feed Engagement**:
   - Click-through rate (CTR) on feed cards
   - Time spent browsing feed
   - Circles joined from feed

2. **Algorithm Performance**:
   - % of users with location permission
   - % of circles with geoLocation
   - Average join velocity across circles
   - Distribution of category affinity scores

3. **User Satisfaction**:
   - Feed refresh rate
   - Search usage (manual filters)
   - User feedback on relevance

### Analytics Events

Already tracked:
- `trackCircleJoin()` - Category affinity
- `trackTransitSearch()` - Travel context
- Location updates - Proximity

**Add these** for monitoring:
```typescript
// Track feed impressions
trackFeedImpression(circleId, relevanceScore, position);

// Track feed clicks
trackFeedClick(circleId, relevanceScore, position);
```

---

## Troubleshooting

### Circles not sorted by relevance

**Check**:
1. Is user logged in? (Preferences require auth)
2. Is location permission granted?
3. Are circles missing `geoLocation` field?
4. Are manual filters active? (Disables relevance sorting)

### Location not working

**Check**:
1. Location permission granted in app settings
2. GPS enabled on device
3. `expo-location` package installed
4. iOS: `NSLocationWhenInUseUsageDescription` in Info.plist

### Join velocity always 0

**Check**:
1. Are `memberJoinTimestamps` being saved on join?
2. Is Cloud Function running? (If using server-side calculation)
3. Are timestamps within last 24 hours?

### Category affinity not updating

**Check**:
1. Is `trackCircleJoin()` being called on join?
2. Does `userPreferences` document exist?
3. Is Firestore security rule allowing writes?

---

## Security Rules

Add to `firestore.rules`:

```javascript
// User preferences (read/write own only)
match /userPreferences/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Analytics (write only, no reads)
match /analytics/{document=**} {
  allow write: if request.auth != null;
  allow read: if false;
}
```

---

## Future Enhancements

### 1. Machine Learning Ranking

Replace hand-tuned weights with ML model trained on user engagement data.

**Approach**:
- Collect training data: (circle features, user features, engagement)
- Train ranking model (e.g., LightGBM, TensorFlow)
- Deploy model to Cloud Functions
- A/B test against current algorithm

### 2. Collaborative Filtering

"Users who joined circles you like also joined..."

**Approach**:
- Build user-circle interaction matrix
- Use matrix factorization or item-based CF
- Recommend circles based on similar users

### 3. Time-of-Day Personalization

Boost different categories at different times:
- Morning: Fitness circles
- Lunch: Food circles
- Evening: Entertainment circles

### 4. Social Graph Integration

Boost circles created by friends or friends-of-friends.

**Requires**: Friend/follow system

---

## Conclusion

The feed relevance algorithm is **fully implemented** and ready to use. It provides personalized, context-aware circle recommendations based on:

1. ✅ Location proximity
2. ✅ Travel context
3. ✅ Join velocity (trending)
4. ✅ Category affinity (personalization)

**Next steps**:
1. Deploy Cloud Function for join velocity calculation (optional)
2. Monitor algorithm performance
3. A/B test weight adjustments
4. Collect user feedback

**Questions?** See `FEED_RELEVANCE_ALGORITHM_STATUS.md` for implementation details.
