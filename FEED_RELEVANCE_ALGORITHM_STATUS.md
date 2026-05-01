# Feed Relevance Algorithm - Implementation Status

**Date**: April 30, 2026

---

## Report Requirement (Section 5.1)

> "The Open Feed is the first tab a user sees when they open the app. It is a vertically scrollable list of public circle cards, ordered by a relevance algorithm that considers:
> - Location proximity (circles near the user's current city or GPS location)
> - Travel context (transit circles matching a train/flight/bus the user has searched or recently used)
> - Join velocity (circles gaining members quickly in the last 24 hours)
> - Category affinity (circles similar to those the user has joined before)"

---

## Current Implementation Status

### ✅ **IMPLEMENTED**: Basic Feed Infrastructure

**Evidence**: `circles/src/screens/main/FeedScreen.tsx`

**Features Working**:
1. **Vertical Scrollable Feed** ✅
   - FlatList with infinite scroll
   - Pagination (20 circles per page)
   - Pull-to-refresh

2. **Category Filtering** ✅
   - 8 categories (Travel, Fitness, Music, Food, Hobby, Neighbourhood, Professional, Other)
   - Real-time filtering

3. **Transit Search** ✅
   - Search by train number, flight code, bus route
   - Date-based filtering
   - Exact match filtering

4. **Location Display** ✅
   - "Near me 📍" location selector
   - City-based filtering (UI ready)

**Current Ordering**:
```typescript
// FeedScreen.tsx - Line 73
let q = query(
  circlesRef,
  where('isArchived', '==', false),
  orderBy('createdAt', 'desc'),  // ⚠️ Simple chronological ordering
  limit(PAGE_SIZE)
);
```

---

## ⚠️ **PARTIALLY IMPLEMENTED**: Relevance Algorithm

### 1. Location Proximity ⚠️ **PARTIAL**

**Status**: Infrastructure exists, but not used for ranking

**Evidence**:
- `circles/src/services/feed.service.ts` has `calculateDistance()` function (Haversine formula)
- Location filtering works (client-side)
- GPS location not yet integrated into ranking

**What's Missing**:
- GPS location permission request
- Distance calculation in feed ranking
- Boost score for nearby circles

**Implementation Path**:
```typescript
// TODO: Add to feed ranking
const locationScore = (circle: OpenCircle, userLocation: { lat: number; lon: number }) => {
  if (!circle.location || !userLocation) return 0;
  
  const distance = calculateDistance(
    userLocation.lat,
    userLocation.lon,
    circle.location.latitude,
    circle.location.longitude
  );
  
  // Boost nearby circles (within 10km = 1.0, 50km = 0.5, 100km+ = 0)
  if (distance <= 10) return 1.0;
  if (distance <= 50) return 0.5;
  return 0;
};
```

---

### 2. Travel Context ✅ **IMPLEMENTED**

**Status**: Fully working

**Evidence**: `circles/src/screens/main/FeedScreen.tsx`

**Features**:
- Transit search by route + date
- Exact match filtering
- Search bar with route and date inputs

**Code**:
```typescript
// Apply transit filter
if (transitFilter) {
  q = query(
    circlesRef,
    where('isArchived', '==', false),
    where('transitRoute', '==', transitFilter.route),
    where('transitDate', '==', transitFilter.date),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  );
}
```

**Note**: This is exact match filtering, not relevance boosting. Works perfectly for "show me circles for train 12163 on April 20" use case.

---

### 3. Join Velocity ❌ **NOT IMPLEMENTED**

**Status**: Not implemented

**What's Missing**:
- No tracking of member join timestamps
- No calculation of join rate (members/hour)
- No boost for "trending" circles

**Data Model Gap**:
```typescript
// Current OpenCircle type
export interface OpenCircle {
  memberCount: number;  // ✅ Total count exists
  members: string[];    // ✅ Member UIDs exist
  createdAt: number;    // ✅ Circle creation time exists
  // ❌ Missing: memberJoinTimestamps: { uid: string; timestamp: number }[]
}
```

**Implementation Path**:
```typescript
// TODO: Add to OpenCircle data model
interface OpenCircle {
  // ... existing fields
  memberJoinTimestamps?: Array<{ uid: string; timestamp: number }>;
  joinVelocity?: number; // members joined in last 24h
}

// TODO: Calculate join velocity
const calculateJoinVelocity = (circle: OpenCircle): number => {
  if (!circle.memberJoinTimestamps) return 0;
  
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentJoins = circle.memberJoinTimestamps.filter(
    (join) => join.timestamp > twentyFourHoursAgo
  );
  
  return recentJoins.length;
};

// TODO: Add to relevance score
const joinVelocityScore = (circle: OpenCircle) => {
  const velocity = circle.joinVelocity || 0;
  
  // Boost circles with 5+ joins in 24h
  if (velocity >= 10) return 1.0;
  if (velocity >= 5) return 0.7;
  if (velocity >= 2) return 0.4;
  return 0;
};
```

---

### 4. Category Affinity ❌ **NOT IMPLEMENTED**

**Status**: Not implemented

**What's Missing**:
- No tracking of user's joined circle categories
- No user preference profile
- No personalized ranking based on past behavior

**Analytics Gap**:
- `analytics.service.ts` tracks circle creation ✅
- But does NOT track which circles a user has joined ❌

**Implementation Path**:
```typescript
// TODO: Add to analytics.service.ts
export const trackCircleJoin = async (
  circleId: string,
  circleType: 'private' | 'open',
  category: string
): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  await setDoc(doc(firestore, `analytics/circleJoins/${circleId}_${userId}`), {
    circleId,
    userId,
    circleType,
    category,
    timestamp: serverTimestamp(),
  });
};

// TODO: Build user preference profile
interface UserPreferences {
  uid: string;
  categoryAffinity: {
    travel: number;
    fitness: number;
    music: number;
    food: number;
    hobby: number;
    neighbourhood: number;
    professional: number;
    other: number;
  };
  lastUpdated: number;
}

// TODO: Calculate category affinity score
const categoryAffinityScore = (
  circle: OpenCircle,
  userPreferences: UserPreferences
): number => {
  return userPreferences.categoryAffinity[circle.category] || 0;
};
```

---

## Summary Table

| Relevance Factor | Status | Evidence | Gap |
|------------------|--------|----------|-----|
| **Location Proximity** | ⚠️ Partial | Distance calculation exists | Not used in ranking |
| **Travel Context** | ✅ Implemented | Transit search works | None (exact match filtering) |
| **Join Velocity** | ❌ Not Implemented | - | No join timestamps, no velocity calculation |
| **Category Affinity** | ❌ Not Implemented | - | No user preference tracking |

---

## Current Feed Ordering

**What Users See Now**:
- Circles ordered by **creation time** (newest first)
- Manual filtering by category (8 options)
- Manual search by transit route + date
- Manual location selection (city)

**This Works For**:
- Browsing latest circles ✅
- Finding specific transit circles ✅
- Filtering by interest category ✅

**This Does NOT Work For**:
- Personalized recommendations ❌
- Discovering trending circles ❌
- Prioritizing nearby circles ❌
- Showing relevant circles based on past behavior ❌

---

## Recommendation

### Option 1: **Keep Current Implementation** (Simpler)

**Rationale**:
- Current chronological + manual filtering works well
- Users can find what they need via category filter and transit search
- Simpler to maintain, no ML/ranking complexity
- Transparent to users (newest first is predictable)

**Trade-off**: Less personalized, no "smart" recommendations

---

### Option 2: **Implement Full Relevance Algorithm** (As Per Report)

**Implementation Steps**:

1. **Add Join Velocity Tracking** (2-3 days)
   - Add `memberJoinTimestamps` to OpenCircle data model
   - Track join timestamp when user joins circle
   - Calculate `joinVelocity` field (Cloud Function or client-side)
   - Boost circles with high velocity in ranking

2. **Add Category Affinity Tracking** (3-4 days)
   - Track circle joins in analytics
   - Build user preference profile (Cloud Function)
   - Store category affinity scores per user
   - Use in ranking algorithm

3. **Integrate GPS Location** (1-2 days)
   - Request location permission on app open
   - Store user's current location (city + GPS)
   - Calculate distance to circles
   - Boost nearby circles in ranking

4. **Build Composite Ranking Algorithm** (2-3 days)
   - Combine all 4 factors with weights
   - Sort circles by relevance score
   - A/B test weights for optimal UX

**Total Effort**: ~8-12 days

**Composite Score Formula**:
```typescript
const calculateRelevanceScore = (
  circle: OpenCircle,
  userLocation: { lat: number; lon: number },
  userPreferences: UserPreferences,
  transitSearchActive: boolean
): number => {
  // Base recency score (decay over time)
  const ageInHours = (Date.now() - circle.createdAt) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - ageInHours / 168); // Decay over 7 days

  // Location proximity score (0-1)
  const locationScore = calculateLocationScore(circle, userLocation);

  // Join velocity score (0-1)
  const velocityScore = calculateJoinVelocityScore(circle);

  // Category affinity score (0-1)
  const affinityScore = userPreferences.categoryAffinity[circle.category] || 0;

  // Transit match score (0 or 1)
  const transitScore = transitSearchActive ? 1 : 0;

  // Weighted composite score
  const weights = {
    recency: 0.2,
    location: 0.3,
    velocity: 0.2,
    affinity: 0.2,
    transit: 0.1,
  };

  return (
    recencyScore * weights.recency +
    locationScore * weights.location +
    velocityScore * weights.velocity +
    affinityScore * weights.affinity +
    transitScore * weights.transit
  );
};
```

---

## Conclusion

**Current Status**: 
- ✅ Feed infrastructure is solid
- ✅ Manual filtering works well
- ⚠️ Relevance algorithm is **partially implemented** (2/4 factors)
- ❌ Personalization and trending features are missing

**Recommendation**: 
- If project timeline is tight → **Keep current implementation** (works well for MVP)
- If aiming for full report compliance → **Implement full algorithm** (~2 weeks effort)

**User Impact**:
- Current: Users manually filter and browse (works fine, predictable)
- With algorithm: Users see personalized, relevant circles automatically (better discovery, but more complex)
