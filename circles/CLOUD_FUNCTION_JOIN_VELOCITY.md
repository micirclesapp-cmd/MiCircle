# Cloud Function: Calculate Join Velocity

This Cloud Function should be deployed to Firebase Functions to automatically calculate the `joinVelocity` field for all open circles every hour.

## Purpose

The `joinVelocity` field tracks how many members joined a circle in the last 24 hours. This is used by the feed relevance algorithm to boost "trending" circles.

## Implementation

### File: `functions/src/calculateJoinVelocity.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Scheduled function that runs every hour to calculate join velocity
 * for all active open circles
 */
export const calculateJoinVelocity = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    try {
      // Get all active open circles
      const circlesSnapshot = await db
        .collection('public_circles')
        .where('isArchived', '==', false)
        .get();

      const batch = db.batch();
      let updateCount = 0;

      circlesSnapshot.forEach((doc) => {
        const circle = doc.data();
        const memberJoinTimestamps = circle.memberJoinTimestamps || [];

        // Count joins in last 24 hours
        const recentJoins = memberJoinTimestamps.filter(
          (join: { uid: string; timestamp: number }) => join.timestamp > twentyFourHoursAgo
        );

        const joinVelocity = recentJoins.length;

        // Update circle with new joinVelocity
        batch.update(doc.ref, { joinVelocity });
        updateCount++;
      });

      await batch.commit();

      console.log(`Updated join velocity for ${updateCount} circles`);
      return null;
    } catch (error) {
      console.error('Error calculating join velocity:', error);
      throw error;
    }
  });

/**
 * Triggered function that updates join velocity when a member joins
 * This provides real-time updates instead of waiting for the hourly job
 */
export const updateJoinVelocityOnJoin = functions.firestore
  .document('public_circles/{circleId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if memberJoinTimestamps changed (new member joined)
    const beforeTimestamps = before.memberJoinTimestamps || [];
    const afterTimestamps = after.memberJoinTimestamps || [];

    if (afterTimestamps.length > beforeTimestamps.length) {
      // New member joined, recalculate velocity
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

      const recentJoins = afterTimestamps.filter(
        (join: { uid: string; timestamp: number }) => join.timestamp > twentyFourHoursAgo
      );

      const joinVelocity = recentJoins.length;

      // Update circle
      await change.after.ref.update({ joinVelocity });

      console.log(`Updated join velocity for circle ${context.params.circleId}: ${joinVelocity}`);
    }

    return null;
  });

/**
 * Cleanup old join timestamps (keep only last 30 days)
 * Runs daily to prevent unbounded array growth
 */
export const cleanupOldJoinTimestamps = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    try {
      const circlesSnapshot = await db
        .collection('public_circles')
        .where('isArchived', '==', false)
        .get();

      const batch = db.batch();
      let cleanupCount = 0;

      circlesSnapshot.forEach((doc) => {
        const circle = doc.data();
        const memberJoinTimestamps = circle.memberJoinTimestamps || [];

        // Keep only timestamps from last 30 days
        const recentTimestamps = memberJoinTimestamps.filter(
          (join: { uid: string; timestamp: number }) => join.timestamp > thirtyDaysAgo
        );

        // Only update if we removed some timestamps
        if (recentTimestamps.length < memberJoinTimestamps.length) {
          batch.update(doc.ref, { memberJoinTimestamps: recentTimestamps });
          cleanupCount++;
        }
      });

      await batch.commit();

      console.log(`Cleaned up old timestamps for ${cleanupCount} circles`);
      return null;
    } catch (error) {
      console.error('Error cleaning up timestamps:', error);
      throw error;
    }
  });
```

## Deployment

1. Install Firebase Functions:
```bash
cd circles
npm install -g firebase-tools
firebase init functions
```

2. Add the functions to `functions/src/index.ts`:
```typescript
export { 
  calculateJoinVelocity, 
  updateJoinVelocityOnJoin,
  cleanupOldJoinTimestamps 
} from './calculateJoinVelocity';
```

3. Deploy:
```bash
firebase deploy --only functions
```

## Testing

Test the function locally:
```bash
cd functions
npm run serve
```

## Monitoring

View function logs:
```bash
firebase functions:log
```

## Cost Estimation

- **calculateJoinVelocity**: Runs 24 times/day (every hour)
- **updateJoinVelocityOnJoin**: Runs on every circle update (real-time)
- **cleanupOldJoinTimestamps**: Runs 1 time/day

Estimated cost: ~$0.50-$2.00/month for 1000 active circles with moderate join activity.

## Alternative: Client-Side Calculation

If you don't want to use Cloud Functions, you can calculate join velocity client-side in the feed screen:

```typescript
// In FeedScreen.tsx
const calculateJoinVelocityClientSide = (circle: OpenCircle): number => {
  if (!circle.memberJoinTimestamps) return 0;
  
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentJoins = circle.memberJoinTimestamps.filter(
    (join) => join.timestamp > twentyFourHoursAgo
  );
  
  return recentJoins.length;
};

// Apply to each circle before sorting
const circlesWithVelocity = fetchedCircles.map(circle => ({
  ...circle,
  joinVelocity: calculateJoinVelocityClientSide(circle),
}));
```

**Trade-off**: Client-side calculation is simpler but less efficient (calculates on every feed load instead of pre-computed).
