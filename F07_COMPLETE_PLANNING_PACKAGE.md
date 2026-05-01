# F-07: Push Notifications - Complete Planning Package

## 📑 Documentation Index

### START HERE
👉 **F07_PLAN_COMPLETE.md** - Executive summary of complete plan
- Status overview
- What's been done
- Next steps
- Quick reference

### Detailed Planning
📋 **F07_IMPLEMENTATION_PLAN.md** (10 KB)
- 20 implementation tasks
- 6 phases breakdown
- Architecture design
- Technical decisions
- Timeline & effort estimates

🎯 **F07_FEATURE_SPECIFICATION.md** (10 KB)
- User stories
- Functional requirements
- 7 notification types with triggers
- Acceptance criteria
- Integration points

🚀 **F07_IMPLEMENTATION_KICKOFF.md** (8 KB)
- Quick getting started guide
- Prerequisites checklist
- Step-by-step kickoff
- Success metrics
- Testing checklist

---

## 📊 Implementation Overview

**Feature**: F-07 Push Notifications
**Status**: ✅ **PLAN COMPLETE - READY TO IMPLEMENT**
**Priority**: P0 - Critical (MVP)
**Effort**: 8 hours
**Tasks**: 20 (all pending)

### What's Being Built
- FCM-based push notifications for iOS & Android
- 7 notification types (messages, plans, circle activity, etc.)
- Deep linking to relevant screens
- Full notification preference controls
- Message batching (max 1 per circle per 5 min)

### Technology Stack
- Firebase Cloud Messaging (FCM)
- iOS APNs integration
- Android FCM integration
- React Native for app-side handling
- Cloud Functions for backend sending

---

## 🎯 7 Notification Types

| # | Type | Trigger | Recipients |
|----|------|---------|------------|
| 1 | message_new | New message | Circle members |
| 2 | member_joined | User joins | Admin only |
| 3 | plan_created | Plan created | All members |
| 4 | rsvp_nudge | 24h after plan | Non-responders |
| 5 | plan_24h_reminder | 24h before plan | Going + Maybe |
| 6 | join_request_received | Join request | Approval circles |
| 7 | transit_match_alert | Route match | Saved routes |

---

## 📁 20 Implementation Tasks

### Phase 1: Core Services (4 tasks)
```
f07-fcm-setup                    → Configure FCM (iOS + Android)
f07-token-service               → Token management service
f07-notification-service        → App-side notification handler
f07-notification-store          → Notification state store
```

### Phase 2: Notification Types (3 tasks)
```
f07-message-notification        → Message notifications (batched)
f07-circle-notifications        → Circle event notifications
f07-plan-notifications          → Plan event notifications
```

### Phase 3: Cloud Functions (3 tasks)
```
f07-message-cloud-function      → Message notification backend
f07-plan-cloud-function         → Plan notification backend
f07-circle-cloud-function       → Circle event notification backend
```

### Phase 4: Deep Linking (3 tasks)
```
f07-deep-linking                → Universal Links + App Links setup
f07-notification-handlers       → Notification routing logic
f07-notification-ui             → Foreground UI components
```

### Phase 5: Settings & Preferences (4 tasks)
```
f07-preferences-store           → Preference state store
f07-preferences-service         → Preference persistence service
f07-settings-screen             → Settings UI with toggles
f07-preferences-sync            → Auto-sync preferences on app open
```

### Phase 6: Integration & Testing (3 tasks)
```
f07-integration                 → App-level integration
f07-testing                     → Comprehensive testing
f07-documentation               → Final guides + troubleshooting
```

---

## 🏗️ Architecture Summary

### Firebase Collections
```
/users/{uid}
  ├── fcmToken (primary token)
  └── fcmTokenUpdatedAt

/notificationPreferences/{uid}
  ├── messageNotifications (bool)
  ├── planNotifications (bool)
  ├── circleActivityNotifications (bool)
  ├── joinRequestNotifications (bool)
  ├── transitMatchAlerts (bool)
  ├── rsvpReminders (bool)
  └── plan24hReminders (bool)

/notificationQueues/{uid}/{circleId}
  ├── lastNotificationAt
  ├── messageCount
  └── nextBatchTime (5 min window)
```

### Services to Create
1. `fcmService.ts` - Token management
2. `notificationService.ts` - Foreground/background handling
3. `notificationBatching.service.ts` - Batching logic
4. `notificationPreferences.service.ts` - Persistence
5. `notificationHandlers.ts` - Deep link routing
6. `notifications.store.ts` - Notification state
7. `notificationPreferences.store.ts` - Preference state

### Cloud Functions
1. `onMessageCreated.js` - Message notifications
2. `onPlanCreated.js` - Plan notifications
3. `onCircleEvent.js` - Circle event notifications

### UI Components
1. `NotificationSettingsScreen.tsx` - Settings UI
2. `NotificationCenter.tsx` - Notification history
3. `NotificationBadge.tsx` - Unread badge
4. `DeepLinkHandler.tsx` - Route handler

---

## ⚡ Timeline

| Phase | Hours | Status |
|-------|-------|--------|
| 1. Core Services | 1.5 | Pending |
| 2. Notification Types | 1 | Pending |
| 3. Cloud Functions | 1.5 | Pending |
| 4. Deep Linking & UI | 1 | Pending |
| 5. Settings & Prefs | 1 | Pending |
| 6. Integration & Testing | 2 | Pending |
| **Total** | **8** | **Pending** |

**Estimated Completion**: 1 day

---

## ✅ Success Criteria

✅ All 7 notification types working
✅ Message delivery <500ms on 4G
✅ Deep linking to correct screens
✅ 7 preference toggles functioning
✅ Preferences persisted to Firestore
✅ Preferences synced on app open
✅ Message batching enforced (max 1 per 5 min)
✅ iOS APNs integration working
✅ Android FCM integration working
✅ Zero crashes on notification received
✅ Comprehensive error handling
✅ Full documentation

---

## 🚀 Getting Started

### 1. Preparation
- [ ] Read F07_FEATURE_SPECIFICATION.md
- [ ] Read F07_IMPLEMENTATION_PLAN.md
- [ ] Prepare Firebase (APNs certificate)
- [ ] Gather credentials (service accounts, keys)

### 2. Phase 1 (Core Services)
- [ ] Create fcmService.ts
- [ ] Create notificationService.ts
- [ ] Create notification stores
- [ ] Test FCM setup

### 3. Phase 2-3 (Types & Cloud Functions)
- [ ] Define notification types
- [ ] Deploy Cloud Functions
- [ ] Test sending notifications

### 4. Phase 4-5 (UI & Settings)
- [ ] Implement deep linking
- [ ] Create Settings screen
- [ ] Add preference toggles

### 5. Phase 6 (Testing & Docs)
- [ ] Test all notification types
- [ ] Verify deep links
- [ ] Write documentation
- [ ] Final QA

---

## 📊 SQL Todos

All 20 tasks created in SQL database:

**Query pending todos**:
```sql
SELECT id, title FROM todos WHERE id LIKE 'f07-%' AND status = 'pending';
```

**Start a task**:
```sql
UPDATE todos SET status = 'in_progress' WHERE id = 'f07-fcm-setup';
```

**Mark task complete**:
```sql
UPDATE todos SET status = 'done' WHERE id = 'f07-fcm-setup';
```

---

## 🔧 Technical Requirements

### Firebase Setup
- [ ] Cloud Messaging enabled
- [ ] APNs certificate (iOS)
- [ ] Google Play Services (Android)
- [ ] Service account key for Cloud Functions

### App Requirements
- [ ] React Native configured
- [ ] Firebase SDK installed
- [ ] Deep linking configured
- [ ] Intent filters set up (Android)

### Credentials Needed
- [ ] APNs Push Certificate
- [ ] Firebase Admin SDK key
- [ ] Android API Key (if using FCM)

---

## 📱 Notification Examples

### Message Notification
```
Title: Friends
Body: 3 new messages
Deep Link: circles://chat?circleId=circle_123
```

### Plan Notification
```
Title: Friends - Hike Plan
Body: Plan created: Mountain Trail - Sat 10am
Deep Link: circles://plan?planId=plan_456
```

### RSVP Nudge
```
Title: Plans Reminder
Body: Have you RSVPed to Hike at Mountain Trail?
Deep Link: circles://plan?planId=plan_456
```

---

## 🧪 Testing Checklist

- [ ] Send message → notification in <500ms
- [ ] Tap notification → deep links to chat
- [ ] Create plan → notification to members
- [ ] Toggle preference OFF → no notifications
- [ ] Toggle preference ON → notifications resume
- [ ] Test on iOS simulator
- [ ] Test on iOS device (real APNs)
- [ ] Test on Android emulator
- [ ] Test on Android device
- [ ] Test offline behavior
- [ ] Verify batching (max 1 per 5 min)

---

## 📞 Quick Reference

| Need | Location |
|------|----------|
| Feature spec | F07_FEATURE_SPECIFICATION.md |
| Implementation plan | F07_IMPLEMENTATION_PLAN.md |
| Getting started | F07_IMPLEMENTATION_KICKOFF.md |
| SQL todos | Database: `f07-*` |
| Architecture | F07_IMPLEMENTATION_PLAN.md |
| Notification types | F07_FEATURE_SPECIFICATION.md |

---

## ✨ Summary

**F-07 Push Notifications** is fully planned with:
- ✅ 20 SQL tasks created (all pending)
- ✅ Complete feature specification
- ✅ Detailed implementation plan
- ✅ Architecture designed
- ✅ All documentation ready
- ✅ Timeline: 8 hours (1 day)

**Everything is ready. Time to implement!** 🚀

---

## 🎯 Next Action

1. **Review Documentation** - Read the 3 planning documents
2. **Prepare Environment** - Gather Firebase credentials, APNs certificate
3. **Start Phase 1** - Begin with Core Services (fcmService.ts, notificationService.ts)
4. **Execute Systematically** - Follow the 6-phase plan
5. **Track Progress** - Update SQL todos as you go

---

**Status**: ✅ PLANNING COMPLETE
**Next**: Implementation Ready
**Effort**: 8 hours
**Tasks**: 20 (all pending)

🚀 **Ready to Build F-07 Push Notifications!**
