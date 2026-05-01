# F-07: Push Notifications - Implementation Plan & Kickoff

## 🎯 Feature Overview

**F-07 Push Notifications** enables users to receive timely notifications for:
- New messages in circles (batched, max 1 per 5 min)
- Circle activity (member joined, circle events)
- Plan events (created, RSVP reminders, 24h reminder)
- Open Feed opportunities (join requests, transit matches)

All notifications include deep linking to relevant screens and full preference controls.

**Status**: ✅ Plan Complete - Ready to Implement
**Priority**: P0 - Critical (MVP Month 1-3)
**Estimated Effort**: 8 hours (20 tasks across 6 phases)

---

## 📊 20 Implementation Tasks

### Phase 1: Core Services (4 tasks)
1. **f07-fcm-setup** - Configure Firebase Cloud Messaging
   - APNs certificate for iOS
   - Google Play Services for Android
   - Initialize in app.json & app.tsx

2. **f07-token-service** - FCM token management
   - `fcmService.ts` - Token lifecycle management
   - Store in `/users/{uid}/fcmToken`
   - Refresh on app open

3. **f07-notification-service** - App-side notification handling
   - `notificationService.ts` - Foreground + background
   - onMessageReceived() + onNotificationOpened()
   - Routing logic

4. **f07-notification-store** - Notification state
   - `notifications.store.ts` - Zustand store
   - Unread tracking, read/unread status

### Phase 2: Notification Types (3 tasks)
5. **f07-message-notification** - Message notifications
   - Type: `message_new`
   - Batching: max 1 per circle per 5 min
   - Aggregation: "3 new messages in Friends"

6. **f07-circle-notifications** - Circle events
   - Type: `member_joined` (admin only)
   - Type: `circle_activity` (generic)
   - Deep link to circle view

7. **f07-plan-notifications** - Plan events
   - Type: `plan_created` (all members)
   - Type: `rsvp_nudge` (24h after)
   - Type: `plan_24h_reminder` (to Going+Maybe)

### Phase 3: Cloud Functions (3 tasks)
8. **f07-message-cloud-function** - Message Cloud Function
   - Trigger: `/messages/{circleId}/{messageId}`
   - Check batching queue
   - Send to circle members

9. **f07-plan-cloud-function** - Plan Cloud Function
   - Trigger: `/plans/{planId}`
   - Send to all members
   - Schedule timed reminders

10. **f07-circle-cloud-function** - Circle events Cloud Function
    - Trigger: Member joins, transit match, join request
    - Route to correct users

### Phase 4: Deep Linking & UI (3 tasks)
11. **f07-deep-linking** - Set up deep linking
    - Universal Links (iOS)
    - App Links (Android)
    - URL schemes: `circles://chat?circleId=X`

12. **f07-notification-handlers** - Deep link routing
    - Parse notification data
    - Navigate to correct screen
    - Handle edge cases

13. **f07-notification-ui** - Foreground UI
    - `NotificationCenter.tsx` - History modal
    - `NotificationBadge.tsx` - Unread count badge
    - Mark as read, clear all

### Phase 5: Settings & Preferences (4 tasks)
14. **f07-preferences-store** - Preference state
    - `notificationPreferences.store.ts`
    - 7 notification type toggles

15. **f07-preferences-service** - Persistence layer
    - `notificationPreferences.service.ts`
    - Load/save to Firestore
    - Version tracking for migrations

16. **f07-settings-screen** - Settings UI
    - `NotificationSettingsScreen.tsx`
    - 7 toggles (message, plan, circle, join, transit, nudge, 24h)
    - Save button, sync indicator

17. **f07-preferences-sync** - Auto-sync on app open
    - Load from Firestore on login
    - Listen for remote changes
    - Reflect in store

### Phase 6: Integration & Testing (3 tasks)
18. **f07-integration** - App integration
    - Register FCM on auth
    - Deep link handler setup
    - Token refresh lifecycle

19. **f07-testing** - Comprehensive testing
    - Test each notification type
    - Verify preferences toggle on/off
    - Test deep links on iOS + Android
    - Verify delivery speed

20. **f07-documentation** - Complete guides
    - F07_NOTIFICATION_IMPLEMENTATION.md
    - F07_CLOUD_FUNCTIONS_GUIDE.md
    - F07_DEEP_LINKING_GUIDE.md
    - F07_QUICK_REFERENCE.md

---

## 🏗️ Architecture

### Notification Types (7 Total)

| Type | Trigger | Recipients | Batching |
|------|---------|------------|----------|
| `message_new` | Message sent | Circle members | Max 1 per 5 min |
| `member_joined` | Member joins | Circle admin | None |
| `plan_created` | Plan created | Circle members | None |
| `rsvp_nudge` | 24h after plan creation | Non-responders | None |
| `plan_24h_reminder` | 24h before plan | Going + Maybe | None |
| `join_request_received` | Open Feed join request | Approval circles | None |
| `transit_match_alert` | Transit circle posted | Saved route matches | None |

### Firestore Structure

```
/users/{uid}
  ├── fcmToken: string
  ├── fcmTokenUpdatedAt: timestamp

/notificationPreferences/{uid}
  ├── messageNotifications: bool
  ├── planNotifications: bool
  ├── circleActivityNotifications: bool
  ├── joinRequestNotifications: bool
  ├── transitMatchAlerts: bool
  ├── rsvpReminders: bool
  ├── updatedAt: timestamp

/notificationQueues/{uid}/{circleId}
  ├── lastNotificationAt: timestamp
  ├── messageCount: number
  ├── nextBatchTime: timestamp
```

### Deep Linking URLs

```
circles://chat?circleId=C123
circles://plan?planId=P456
circles://circle?circleId=C789
circles://feed?cardId=F012
```

---

## 📁 Files to Create (15 Total)

### Services (5 files, ~1,200 LOC)
- `fcmService.ts` (250 LOC)
- `notificationService.ts` (280 LOC)
- `notificationBatching.service.ts` (220 LOC)
- `notificationPreferences.service.ts` (250 LOC)
- `notificationHandlers.ts` (200 LOC)

### Stores (1 file, ~150 LOC)
- `notifications.store.ts` (150 LOC)
- `notificationPreferences.store.ts` (150 LOC)

### Cloud Functions (3 files, ~800 LOC)
- `functions/onMessageCreated.js` (280 LOC)
- `functions/onPlanCreated.js` (260 LOC)
- `functions/onCircleEvent.js` (260 LOC)

### UI Components (4 files, ~900 LOC)
- `NotificationSettingsScreen.tsx` (300 LOC)
- `NotificationCenter.tsx` (250 LOC)
- `NotificationBadge.tsx` (200 LOC)
- `DeepLinkHandler.tsx` (150 LOC)

### Configuration (2 files, ~150 LOC)
- `app.json` - FCM + deep linking
- `functions/firebase.json` - Cloud Function config

**Total**: 15 files, ~3,200 LOC

---

## ⚡ Key Implementation Details

### Token Management
- Store primary FCM token in `/users/{uid}/fcmToken`
- Refresh on app open (check token validity)
- Handle token changes (re-register if changed)
- Optional: Store multiple device tokens in `/users/{uid}/fcmDevices`

### Notification Batching
- Max 1 message notification per circle per 5 min
- Aggregate: "3 new messages in Friends circle"
- Track in `/notificationQueues/{uid}/{circleId}`
- Cloud Function checks window before sending

### Preferences
- 7 notification type toggles
- Store in `/notificationPreferences/{uid}`
- Load on app open
- Sync with remote changes
- Version field for future migrations

### Deep Linking
- Universal Links (iOS): `.well-known/apple-app-site-association`
- App Links (Android): intent filters + `assetlinks.json`
- URL scheme: `circles://screen?params=value`
- Fallback to manual navigation if deep link fails

---

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Send test message notification from Firebase Console
- [ ] Send circle event notification
- [ ] Send plan notification
- [ ] Tap each notification type → verify deep link
- [ ] Toggle each preference → verify notifications block/allow
- [ ] Test on iOS (simulator + device)
- [ ] Test on Android (simulator + device)
- [ ] Test delivery speed (<500ms target)
- [ ] Test offline behavior (notification when app reopens)

### Unit Test Coverage
- Token refresh logic
- Preference toggle logic
- Batching queue logic
- Deep link URL parsing
- Notification type routing

---

## 📈 Success Criteria

✅ All 7 notification types working
✅ Deep linking to all screens functioning
✅ Preferences persisted & synced
✅ Batching limits enforced (1 per circle per 5 min)
✅ iOS (APNs) & Android both working
✅ <500ms notification delivery (target)
✅ Settings screen with all toggles
✅ Comprehensive error handling
✅ Full documentation

---

## 🚀 Deployment Readiness

**Pre-requisites**:
- [ ] Firebase Cloud Messaging configured
- [ ] APNs certificate uploaded to Firebase
- [ ] Android Google Play Services verified
- [ ] Deep linking URLs registered
- [ ] Cloud Functions deployed

**Rollout Plan**:
1. Manual testing (Firebase Console)
2. Staged app rollout (10% → 50% → 100%)
3. Monitor notification delivery rates
4. Gather user feedback

---

## 📚 Documentation to Create (50+ KB)

1. **F07_NOTIFICATION_IMPLEMENTATION.md** (15 KB)
   - Architecture, setup, notification types, troubleshooting

2. **F07_CLOUD_FUNCTIONS_GUIDE.md** (12 KB)
   - Cloud Function setup, testing, monitoring, debugging

3. **F07_DEEP_LINKING_GUIDE.md** (10 KB)
   - Universal Links, App Links, URL scheme setup, testing

4. **F07_QUICK_REFERENCE.md** (10 KB)
   - Quick setup, FAQ, common issues, debugging

---

## 🎯 Next Steps

1. **Confirm Requirements** - Verify 7 notification types and preferences
2. **Prepare Firebase** - Upload APNs certificate, configure FCM
3. **Start Implementation** - Begin with Phase 1 (Core Services)
4. **Parallel Work** - Services + Cloud Functions can progress simultaneously
5. **Integration** - Connect once all components ready
6. **Testing** - Comprehensive manual + automated testing
7. **Documentation** - Create guides as you implement
8. **Deployment** - Staged rollout with monitoring

---

## ✅ Status

**Phase**: Planning Complete ✅
**Tasks Created**: 20 ✅
**Documentation**: Ready to Write ✅
**Next Action**: Confirm requirements → Start Phase 1 ✅

**Ready to Implement!** 🚀
