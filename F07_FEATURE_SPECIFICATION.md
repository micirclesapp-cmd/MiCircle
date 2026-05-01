# F-07: Push Notifications - Feature Specification & Implementation Guide

## 🎯 Feature Overview

**F-07 Push Notifications** is a P0 critical feature that enables users to receive timely notifications for all key events across both pillars of the Circles app.

- **Pillar 1**: Private circles (messages, plans, circle activity)
- **Pillar 2**: Open discovery (join requests, transit matches)

**Technology**: Firebase Cloud Messaging (FCM) with iOS APNs and Android integration

---

## 📋 User Stories

1. **As a user, I receive timely notifications for new messages, plans, and circle activity.**
   - Message from circle → Notification arrives <500ms
   - Plan created in circle → Notification to all members
   - RSVP reminder → Notification 24h after creation

2. **As a user, I can control which notifications I receive from Settings.**
   - 7 notification type toggles
   - Preferences synced to Firestore
   - Auto-apply on next app open

---

## 🎯 APIs & Services

| Service | Purpose | Notes |
|---------|---------|-------|
| Firebase Cloud Messaging | iOS & Android delivery | iOS requires APNs certificate |
| Cloud Functions | Server-side trigger logic | Plan reminders & nudges |
| Firestore | Token & preference storage | Security rules enforce access |
| AsyncStorage | Local caching (optional) | For offline queueing |

---

## ✅ Functional Requirements

### 1. FCM Setup (iOS & Android)
- ✅ Configure Firebase Cloud Messaging
- ✅ Set up APNs certificate for iOS
- ✅ Google Play Services for Android
- ✅ Initialize in app.json & app.tsx

### 2. Notification Types & Triggers (7 Total)

| # | Type | Trigger | Recipients | Notes |
|----|------|---------|------------|-------|
| 1 | `message_new` | New message sent | Circle members | Batched: max 1 per 5 min |
| 2 | `member_joined` | User joins circle | Circle admin only | Includes joiner name |
| 3 | `plan_created` | Plan created | All circle members | Deep link to plan |
| 4 | `rsvp_nudge` | 24h after plan creation | Non-responders | Reminder to RSVP |
| 5 | `plan_24h_reminder` | 24h before plan | Going + Maybe only | Include time + location |
| 6 | `join_request_received` | Join request in Open Feed | Approval circles | Includes requester name |
| 7 | `transit_match_alert` | Transit circle posted | Route match + members | Include transit info |

### 3. Notification Delivery

**Speed Target**: <500ms on 4G
- Firebase Cloud Messaging: <100ms typical
- App receives + processes: <400ms

**Batching Strategy**:
- Message notifications: Max 1 per circle per 5-minute window
- Aggregate count: "3 new messages in Friends circle"
- Server-side enforcement in Cloud Function

### 4. Deep Linking

Notification tap navigates to:
- **Message**: Chat screen for circle
- **Plan**: Plan details screen
- **Join Request**: Open Feed card view
- **Transit Match**: Circle match details

URL Schemes:
```
circles://chat?circleId=C123
circles://plan?planId=P456
circles://feed?cardId=F789
circles://circle?circleId=C012
```

### 5. Notification Preferences

**7 Preference Toggles**:
- [ ] Message notifications (on/off)
- [ ] Plan notifications (on/off)
- [ ] Circle activity (on/off)
- [ ] Join requests (on/off)
- [ ] Transit alerts (on/off)
- [ ] RSVP reminders (on/off)
- [ ] 24h plan reminders (on/off)

**Storage**:
- Firestore: `/notificationPreferences/{uid}`
- Persist: On toggle in Settings
- Sync: On app open (automatic refresh)

### 6. FCM Token Management

**Storage**:
- Primary token: `/users/{uid}/fcmToken`
- Timestamp: `/users/{uid}/fcmTokenUpdatedAt`
- Optional devices array: `/users/{uid}/fcmDevices`

**Lifecycle**:
- Generate on first app open
- Refresh on app startup (check validity)
- Store on login/logout transitions
- Handle token rotation (listen for refresh)

### 7. Notification Preferences & Settings

**Settings Screen**:
- Show all 7 preference toggles
- Last sync timestamp
- Test notification button (Firebase Console)

**Persistence**:
- Save immediately on toggle
- Verify save succeeded
- Sync remotely to prevent duplication

---

## 🏗️ Architecture

### Firebase Collection Structure

```
/users/{uid}
  ├── fcmToken: string (primary device token)
  ├── fcmTokenUpdatedAt: timestamp
  └── fcmDevices: [
        {
          token: string,
          platform: "ios" | "android",
          active: boolean,
          lastSeen: timestamp
        }
      ]

/notificationPreferences/{uid}
  ├── messageNotifications: boolean (default: true)
  ├── planNotifications: boolean (default: true)
  ├── circleActivityNotifications: boolean (default: true)
  ├── joinRequestNotifications: boolean (default: true)
  ├── transitMatchAlerts: boolean (default: true)
  ├── rsvpReminders: boolean (default: true)
  ├── plan24hReminders: boolean (default: true)
  ├── updatedAt: timestamp
  └── version: number (for migrations)

/notificationQueues/{uid}/{circleId}
  ├── lastNotificationAt: timestamp
  ├── messageCount: number
  ├── nextBatchTime: timestamp (5 min window)
  └── messages: [messageId1, messageId2, ...]

/notifications/{uid}/{notificationId} (optional: history)
  ├── type: string
  ├── title, body, data
  ├── createdAt, readAt
  └── deepLink: string
```

### Cloud Function Triggers

```
onMessageCreated
  Trigger: /messages/{circleId}/{messageId}
  Logic: Check batching queue, send to members
  
onPlanCreated
  Trigger: /plans/{planId}
  Logic: Send to members, schedule 24h + RSVP reminders
  
onCircleEventCreated
  Trigger: Member joins, transit match, join request
  Logic: Route to appropriate users
```

### App-Side Services

**fcmService.ts**
- `initializeFCM()` - Initialize FCM
- `getFCMToken()` - Get current token
- `refreshToken()` - Refresh token validity
- `registerToken(uid)` - Register token in Firestore
- `deregisterToken()` - Cleanup on logout

**notificationService.ts**
- `onMessageReceived(message)` - Foreground handling
- `onNotificationOpened(notification)` - Deep linking
- Route by notification type

**notificationPreferences.service.ts**
- `loadPreferences(uid)` - From Firestore
- `savePreferences(uid, prefs)` - To Firestore
- `syncOnAppOpen()` - Auto-sync
- `getPreference(type)` - Check if enabled

**notificationPreferences.store.ts** (Zustand)
- Store user preferences in memory
- Getters: `isEnabled(type)`
- Actions: `setPreference(type, value)`, `togglePreference(type)`

---

## 🎯 Implementation Roadmap

**Phase 1**: Core Services (4 hours)
- FCM setup & token management
- Notification service (foreground + background)
- Preference store

**Phase 2**: Notification Types (2 hours)
- Define all 7 notification types
- Batching logic for message notifications

**Phase 3**: Cloud Functions (2 hours)
- Deploy 3 Cloud Functions
- Test sending notifications

**Phase 4**: Deep Linking (1 hour)
- Set up Universal Links + App Links
- Route notifications to screens

**Phase 5**: Settings UI (1 hour)
- Notification Settings screen
- Toggle implementation

**Phase 6**: Testing & Docs (2 hours)
- Manual testing (all notification types)
- Documentation

**Total**: ~8 hours (can be done in 1 day)

---

## 📊 Notification Payload Example

### Message Notification
```json
{
  "notification": {
    "title": "Friends",
    "body": "3 new messages"
  },
  "data": {
    "type": "message_new",
    "circleId": "circle_123",
    "messageCount": 3,
    "deepLink": "circles://chat?circleId=circle_123"
  }
}
```

### Plan Notification
```json
{
  "notification": {
    "title": "Friends - Hike Plan",
    "body": "Plan created: Mountain Trail - Sat 10am"
  },
  "data": {
    "type": "plan_created",
    "planId": "plan_456",
    "circleId": "circle_123",
    "deepLink": "circles://plan?planId=plan_456"
  }
}
```

### RSVP Nudge
```json
{
  "notification": {
    "title": "Plans Reminder",
    "body": "Have you RSVPed to Hike at Mountain Trail?"
  },
  "data": {
    "type": "rsvp_nudge",
    "planId": "plan_456",
    "deepLink": "circles://plan?planId=plan_456"
  }
}
```

---

## 🔐 Security & Privacy

- ✅ No phone numbers in notifications
- ✅ No personal data in notification body
- ✅ Only circle members receive circle notifications
- ✅ Admin-only notifications for sensitive actions
- ✅ Firebase security rules enforce access

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Send message → notification arrives <500ms
- [ ] Tap notification → deep links to chat
- [ ] Create plan → notification to all members
- [ ] Tap plan notification → deep links to plan
- [ ] Toggle message notifications OFF → no messages
- [ ] Toggle message notifications ON → messages resume
- [ ] Join request → notification to approval circle
- [ ] Tap join request → navigates to feed
- [ ] Test on iOS simulator
- [ ] Test on iOS device (actual APNs)
- [ ] Test on Android emulator
- [ ] Test on Android device
- [ ] Test offline (notification when app opens)

### Performance Tests
- [ ] Message notification delivery <500ms
- [ ] Notification processing <100ms
- [ ] Settings save <1s
- [ ] Preference load on app open <2s

---

## ✨ Acceptance Criteria

✅ **Message notification delivery**: <5 seconds on 4G
✅ **Plan reminder timing**: Within 1 minute of 24h-before threshold
✅ **Deep linking**: All notifications tap to correct screen
✅ **Preference toggle**: Disabling notifications stops them immediately
✅ **All 7 notification types**: Working end-to-end
✅ **Preferences persisted**: Saved to Firestore
✅ **Preferences synced**: Loaded on app open
✅ **Message batching**: Max 1 per circle per 5 min
✅ **iOS APNs + Android FCM**: Both platforms working
✅ **No crashes**: Comprehensive error handling

---

## 🛡️ Edge Cases & Error Handling

### Multiple Devices
**Scenario**: User registered on multiple devices (phone + tablet)
- **Handling**: Notify all registered FCM tokens in `/users/{uid}/fcmDevices`
- **Implementation**: Query devices array, send to all active tokens
- **Fallback**: If one token fails, try others (don't block on first failure)

### Stale/Invalid FCM Tokens
**Scenario**: FCM token expired or invalid (device reset, token rotation)
- **Handling**: Catch FCM error response, silently remove stale token from Firestore
- **Implementation**: Remove from `/users/{uid}/fcmDevices` array
- **Retry**: Next app open will generate new token
- **Logging**: Log error for monitoring but don't show user message

### App in Foreground
**Scenario**: Notification arrives while app is open
- **Handling**: Show in-app banner instead of OS notification
- **Implementation**: Detect foreground state, route to in-app handler
- **UX**: Non-intrusive banner at top of screen
- **Interaction**: Tap banner still deep links to relevant screen

### Notification Preference Changes
**Scenario**: User disables notifications in Settings
- **Requirement**: Stop notifications immediately (within next send attempt)
- **Implementation**: Update preference in Firestore, check before sending in Cloud Function
- **No grace period**: Changes apply instantly

### High Message Volume
**Scenario**: Multiple messages in circle within 5-minute window
- **Requirement**: Max 1 notification per circle per 5 min
- **Implementation**: Aggregate in notificationQueues, send single notification with count
- **Example**: "3 new messages in Friends circle" instead of 3 separate notifications

### Offline Users
**Scenario**: User offline when notification scheduled
- **Handling**: FCM handles delivery queue automatically
- **When online**: Notification delivered
- **No local queueing**: FCM manages all queueing

---

## 📱 Integration Points

1. **App Start**: Initialize FCM, load preferences
2. **Auth**: Register FCM token on login
3. **Settings**: Show notification preferences
4. **Message Send**: Trigger message notification
5. **Plan Create**: Trigger plan notification
6. **Notification Tap**: Deep link to screen

---

## 🚀 Deployment

**Pre-requisites**:
- [ ] Firebase Cloud Messaging enabled
- [ ] APNs certificate uploaded
- [ ] Google Play Services configured
- [ ] Deep linking domain registered
- [ ] Cloud Functions deployed

**Rollout**:
1. Staged: 10% → 50% → 100%
2. Monitor delivery rates
3. Monitor error rates
4. Gather user feedback

---

## 📞 Support & Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [iOS APNs Setup](https://firebase.google.com/docs/cloud-messaging/ios/certs)
- [Android FCM Setup](https://firebase.google.com/docs/cloud-messaging/android/client)
- [Deep Linking Guide](https://firebase.google.com/docs/dynamic-links)

---

## ✅ Summary

**F-07 Push Notifications** is a critical MVP feature that keeps users informed of all important events with full control over preferences.

- **7 notification types** covering both pillars
- **Batching** for message overload prevention
- **Deep linking** for seamless navigation
- **Full preferences** for user control
- **<500ms delivery** target
- **iOS + Android** support

Ready for implementation! 🚀
