# F-07: Push Notifications - Implementation Kickoff

## 🎯 Feature: F-07 Push Notifications

**Priority**: P0 - Critical (MVP)
**Phase**: Month 1-3
**Status**: ✅ Plan Complete - Ready to Implement
**Estimated Effort**: 8 hours
**Tasks**: 20 total

---

## 📦 What You're Building

A comprehensive push notification system for the Circles app that:

✅ Sends 7 types of notifications (messages, plans, circle activity, etc.)
✅ Uses Firebase Cloud Messaging (FCM) for iOS & Android
✅ Supports deep linking to relevant screens
✅ Provides full notification preference controls
✅ Batches message notifications (max 1 per circle per 5 min)
✅ Delivers notifications in <500ms

---

## 📊 Implementation Overview

| Phase | Tasks | Effort | Status |
|-------|-------|--------|--------|
| 1. Core Services | 4 | 1.5h | Pending |
| 2. Notification Types | 3 | 1h | Pending |
| 3. Cloud Functions | 3 | 1.5h | Pending |
| 4. Deep Linking & UI | 3 | 1h | Pending |
| 5. Settings & Prefs | 4 | 1h | Pending |
| 6. Integration & Testing | 3 | 2h | Pending |
| **Total** | **20** | **8h** | Pending |

---

## 🎯 7 Notification Types

1. **message_new** - New message in circle (batched, max 1 per 5 min)
2. **member_joined** - Member joined circle (admin only)
3. **plan_created** - Plan created (all members)
4. **rsvp_nudge** - RSVP reminder (24h after plan)
5. **plan_24h_reminder** - Plan starts tomorrow (Going + Maybe)
6. **join_request_received** - Open Feed join request (approval circles)
7. **transit_match_alert** - Transit circle match (route matches)

---

## 📁 20 SQL Todos Created

```
f07-fcm-setup
f07-token-service
f07-notification-service
f07-notification-store
f07-message-notification
f07-circle-notifications
f07-plan-notifications
f07-message-cloud-function
f07-plan-cloud-function
f07-circle-cloud-function
f07-deep-linking
f07-notification-handlers
f07-notification-ui
f07-preferences-store
f07-preferences-service
f07-settings-screen
f07-preferences-sync
f07-integration
f07-testing
f07-documentation
```

All tasks: **PENDING** (ready to start)

---

## 📄 Documentation Created

✅ **F07_IMPLEMENTATION_PLAN.md** (10 KB)
   - Complete implementation plan with all 20 tasks
   - Phase breakdown, architecture, timeline

✅ **F07_FEATURE_SPECIFICATION.md** (10 KB)
   - User stories, requirements, functional specs
   - Payload examples, acceptance criteria

✅ **F07_IMPLEMENTATION_KICKOFF.md** (this file)
   - Quick overview, getting started, next steps

---

## 🚀 Getting Started

### Step 1: Review Requirements
- Read: F07_FEATURE_SPECIFICATION.md
- Confirm: 7 notification types, 7 preferences
- Verify: Targets (<500ms delivery)

### Step 2: Prepare Firebase
- Obtain APNs certificate (from Apple Developer)
- Upload to Firebase Console
- Enable Firebase Cloud Messaging
- Create service account key for Cloud Functions

### Step 3: Start Phase 1 (Core Services)
- Create `fcmService.ts` - Token management
- Create `notificationService.ts` - App-side handler
- Create `notifications.store.ts` - State management
- Create `notificationPreferences.store.ts` - Prefs state

### Step 4: Phase 2 (Notification Types)
- Define 7 notification types
- Implement batching logic for messages

### Step 5: Phase 3 (Cloud Functions)
- Deploy 3 Cloud Functions
- Test sending notifications

### Step 6: Phase 4-5 (UI & Settings)
- Implement deep linking
- Create Settings screen
- Add preference toggles

### Step 7: Phase 6 (Testing & Docs)
- Manual testing of all notification types
- Write documentation guides

---

## 📋 Implementation Checklist

**Phase 1: Core Services**
- [ ] FCM initialized in app.tsx
- [ ] `fcmService.ts` created with token management
- [ ] `notificationService.ts` created with handlers
- [ ] Stores created (notifications + preferences)
- [ ] Token registered in Firestore `/users/{uid}/fcmToken`

**Phase 2: Notification Types**
- [ ] All 7 notification types defined
- [ ] Batching logic for message notifications
- [ ] Notification payloads finalized

**Phase 3: Cloud Functions**
- [ ] `onMessageCreated.js` deployed
- [ ] `onPlanCreated.js` deployed
- [ ] `onCircleEvent.js` deployed
- [ ] All functions tested with Firebase Console

**Phase 4: Deep Linking**
- [ ] Universal Links configured (iOS)
- [ ] App Links configured (Android)
- [ ] Deep link handler implemented
- [ ] URLs tested for all notification types

**Phase 5: Settings & Preferences**
- [ ] `NotificationSettingsScreen.tsx` created
- [ ] All 7 toggles implemented
- [ ] Preferences saved to Firestore
- [ ] Preferences loaded on app open

**Phase 6: Integration & Testing**
- [ ] FCM initialized on app start
- [ ] Token registered on login
- [ ] Preferences loaded on app open
- [ ] Tested all 7 notification types
- [ ] Verified delivery <500ms
- [ ] Documentation complete

---

## 🔧 Prerequisites

**Firebase Setup**:
- [ ] Firebase project created
- [ ] Cloud Messaging enabled
- [ ] APNs certificate (iOS) uploaded
- [ ] Google Play Services (Android) configured
- [ ] Service account key for Cloud Functions

**App Setup**:
- [ ] React Native project configured
- [ ] @react-native-firebase/messaging installed
- [ ] @react-native-firebase/app initialized
- [ ] Deep linking intent filters ready

**Credentials**:
- [ ] Firebase Admin SDK key for Cloud Functions
- [ ] APNs Push Certificate
- [ ] Android API Key

---

## 📊 Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Delivery time | <500ms | Firebase Console logs |
| Notification types | 7/7 | Manual testing |
| Deep links | 100% working | Test each type |
| Preferences | 7/7 toggles | Settings screen |
| Batching | 1 per 5 min | Message count in UI |
| iOS support | Working | APNs delivery |
| Android support | Working | FCM delivery |
| Crashes | 0 | Error monitoring |

---

## 🎓 Key Implementation Details

### Token Management
- Store in `/users/{uid}/fcmToken`
- Refresh on app open (check validity)
- Handle rotation (listen for refresh event)

### Batching Strategy
- Max 1 message notification per circle per 5 min
- Track in `/notificationQueues/{uid}/{circleId}`
- Server-side enforcement in Cloud Function

### Deep Linking
- URLs: `circles://chat?circleId=X`, `circles://plan?planId=Y`
- Implement in `DeepLinkHandler.tsx`
- Test with Firebase Console

### Preferences
- 7 toggles in Settings screen
- Persist to `/notificationPreferences/{uid}`
- Load on app open

---

## 🧪 Quick Testing

### Manual Test Flow
1. Open Firebase Console → Cloud Messaging
2. Send test notification to specific device
3. Receive notification on app
4. Tap notification → verify deep link
5. Check Settings → toggle preference
6. Send notification again → verify blocked/allowed

### For Each Notification Type
- Send from Firebase Console
- Verify delivery
- Tap notification
- Verify navigation to correct screen
- Toggle preference
- Verify behavior changes

---

## 📞 Quick Reference

**Documentation**:
- Specification: F07_FEATURE_SPECIFICATION.md
- Implementation: F07_IMPLEMENTATION_PLAN.md
- Kickoff: F07_IMPLEMENTATION_KICKOFF.md (this file)

**Todos**: 20 tasks in SQL database (f07-*)

**Timeline**: 8 hours (1 day)

**Quality Checklist**: All 7 notifications, <500ms delivery, full preferences

---

## ✅ Ready to Start

**Status**: ✅ All Planning Complete

Next action: Start Phase 1 (Core Services)

Estimated completion: 1 day (8 hours)

---

## 🚀 Let's Go!

Everything is planned and ready. All 20 tasks are in the SQL database, waiting to be executed.

Time to implement **F-07 Push Notifications**! 🎯

---

**Plan Created**: Session 4
**Tasks**: 20 total (all pending)
**Status**: Ready for Implementation
**Next**: Phase 1 - Core Services
