# F-01: Google Sign-In Authentication Implementation

## Overview
This document describes the implementation of the Google Sign-In authentication system for the Circles MVP, replacing email/password auth. The implementation ensures:
- **No phone numbers or exposed emails** stored in Firestore
- **One-tap signup** in under 10 seconds
- **Silent re-authentication** on app open using stored tokens
- **30-minute session timeout** for sensitive admin actions
- **Graceful offline handling** with read-only cached sessions
- **User-friendly error handling** for all edge cases

## Architecture

### Core Components

#### 1. Authentication Service (`src/services/auth.service.ts`)
**Google Sign-In Functions:**
- `signInWithGoogle(idToken, accessToken, displayName?, photoURL?)` - Main OAuth flow handler
  - Creates new Firestore user document if first sign-in
  - Updates session timestamp on each login
  - Returns User object for downstream navigation
  - **CRITICAL**: Never writes email or phone to Firestore

- `silentGoogleReAuth()` - Silent re-authentication on app open
  - Uses stored Google token to refresh session
  - Updates session timestamp in Firestore
  - Returns success/failure without user interruption

- `isSessionExpiredForSensitiveAction()` - Checks 30-min timeout
  - Returns boolean indicating if re-auth is needed
  - Used before removing members, revoking invites, etc.

- `reauthenticateWithGoogle()` - Prompt re-auth for sensitive actions
  - Shows native Google Sign-In UI
  - Updates session timestamp after successful re-auth
  - Used within executeProtectedAction() wrapper

- `signOutGoogle()` - Clean session termination
  - Clears session data from Firestore
  - Signs out from Firebase
  - Clears local auth store

#### 2. Auth Store (`src/store/auth.store.ts`)
Zustand store managing:
- **Onboarding Data** (temporary, cleared after signup):
  - displayName, avatarUrl, bio
- **Session Management**:
  - sessionTimestamp - Last auth time for 30-min timeout
  - lastAuthTime - Timestamp of last successful authentication
  - isOfflineMode - Read-only cached session flag
  - cachedProfile - User profile for offline access

#### 3. UI Components

**GoogleSignInScreen** (`src/screens/auth/GoogleSignInScreen.tsx`)
- Shows native Google Sign-In button (placeholder for @react-native-google-signin integration)
- Displays privacy notice: "Your phone number is never collected or shared"
- Handles sign-in errors gracefully with retry options
- Performance optimized for <10 second signup

**DisplayNameScreen** (`src/screens/auth/DisplayNameScreen.tsx`)
- Collects user-edited display name (not forced Google account name)
- Validates name format (letters, spaces, hyphens only)
- 3-step onboarding flow (Name → Avatar → Bio)

**AvatarScreen** (`src/screens/auth/AvatarScreen.tsx`)
- Shows Google profile photo as suggestion (not forced)
- Provides preset avatar options for users without Google photo
- Fallback to generated avatar with initials

#### 4. Hooks

**useAuth()** - Authentication state management
- Returns: `{ user, profile, loading, error, sessionExpired }`
- Syncs sessionTimestamp from Firestore
- Tracks 30-min session timeout automatically

**useIsSessionExpired()** - Session timeout checker
- Returns boolean indicating if session has expired
- Used before sensitive operations
- Automatically recalculates based on current time

**useIsAuthenticated()** - Auth state checker
- Returns true if user is logged in

**useHasCompletedOnboarding()** - Onboarding state checker
- Returns true if user completed signup flow

#### 5. Utilities

**avatarUtils.ts** - Avatar generation
- `getPresetAvatarForUser(uid)` - Consistent avatar per user
- `generateAvatarSvg(initials, color)` - SVG avatar data URI
- `getInitials(name)` - Extract initials from display name
- `PRESET_AVATARS` - Array of 8 preset avatar colors

**protectedActions.ts** - Sensitive operation protection
- `executeProtectedAction(action, actionName)` - Wrapper for sensitive ops
  - Checks session timeout
  - Prompts re-auth if needed
  - Executes action only if session valid
- `SENSITIVE_ACTIONS` - Constants for action names (remove member, revoke invite, etc.)

## Firestore Schema

### Users Collection (`/users/{uid}`)
```json
{
  "uid": "firebase-uid",
  "displayName": "John Doe",        // User-edited name shown to others
  "avatarUrl": "https://...",       // Google photo OR generated preset
  "bio": "Hello, I'm John",
  "createdAt": 1234567890000,       // Server timestamp
  "joinedVia": "google",            // OAuth provider identifier
  "sessionTimestamp": 1234567890000,// Last auth time for 30-min timeout
  "lastAuthTime": 1234567890000,    // For audit/analytics
  "onboardingCompleted": true,      // User finished signup flow
  "subscription": "free",           // free | plus
  "updatedAt": 1234567890000        // Last update timestamp
}
```

### Critical Security Notes
❌ **NEVER store**: email, phone, google_email, mobile_number
❌ **NEVER expose in UI**: user.email (Firebase Auth field)
❌ **NEVER cache locally**: sensitive tokens without encryption
✅ **ALWAYS store**: idToken (for credential generation)
✅ **ALWAYS clear on logout**: sessionTimestamp, all local data

## Authentication Flow

### Initial Sign-In
1. User taps "Sign In with Google"
2. Native Google Sign-In opens
3. User authorizes with Google
4. Google returns idToken + accessToken
5. `signInWithGoogle()` receives tokens
6. Firebase Auth creates session
7. Firestore user doc created (first-time) or updated
8. sessionTimestamp = now
9. App navigates to DisplayNameScreen for onboarding
10. After onboarding complete, app shows MainTabNavigator

### Subsequent App Opens
1. RootNavigator checks onAuthStateChanged()
2. If user exists, shows loading screen
3. `silentGoogleReAuth()` attempts silent refresh
4. If successful, goes to MainTabNavigator
5. If failed, goes to GoogleSignInScreen
6. Maximum 3-second timeout for silent re-auth

### Sensitive Action (Remove Member, etc.)
1. Component calls `executeProtectedAction()`
2. Checks `isSessionExpiredForSensitiveAction()`
3. If expired (>30 min):
   - Shows alert: "Verify your identity"
   - Calls `reauthenticateWithGoogle()`
   - User signs in again
   - sessionTimestamp updated
   - Action proceeds
4. If valid (<30 min):
   - Action proceeds immediately

### Sign-Out
1. User taps Sign Out
2. `signOutGoogle()` called
3. sessionTimestamp cleared in Firestore
4. Firebase Auth session terminated
5. Local auth store cleared
6. App navigates to GoogleSignInScreen

### Offline Scenarios

**Read-Only Offline**
1. Firestore persistence enabled
2. `getCachedSessionData()` retrieves cached profile
3. App shows cached circles/plans (read-only)
4. setOfflineMode(true) in auth store
5. UI disables write operations

**Offline Write Attempt**
1. User tries to post message, join circle, etc.
2. App detects offline + sessionExpired
3. Shows alert: "Please sign in to continue"
4. On re-connect, waits for user auth
5. Action retried after successful auth

## Key Implementation Details

### Session Timeout Logic
```typescript
const thirtyMinutesMs = 30 * 60 * 1000;
const timeSinceLastAuth = Date.now() - sessionTimestamp;
const isExpired = timeSinceLastAuth > thirtyMinutesMs;
```

### Preventing Email Leakage
In auth.service.ts, when creating user doc:
```typescript
// ✅ CORRECT - No email field
await setDoc(userDocRef, {
  uid: user.uid,
  displayName: displayName,
  avatarUrl: photoURL,
  // ... other fields
  // ❌ NO EMAIL OR PHONE
});

// ✅ Firebase Auth user.email exists but NEVER accessed in UI
// ✅ ONLY used for internal Firebase token management
```

### Avatar Generation Consistency
```typescript
// Same user always gets same avatar across devices
const avatar = getPresetAvatarForUser(uid); // Uses uid hash
// Result: User #123 always gets avatar index = hash % 8
```

## Configuration Required

### Firebase Setup
1. Enable Google Sign-In in Firebase Console
2. Configure OAuth redirect URIs for your domain
3. Ensure Firestore security rules allow:
   - Users to read/write only their own `/users/{uid}` doc
   - Users to read public profile fields of others (displayName, avatarUrl, bio only)

### Native Configuration (Placeholder)
When integrating @react-native-google-signin/google-signin:
1. Add to package.json
2. Configure app.json with OAuth client IDs:
```json
{
  "plugins": [
    ["@react-native-google-signin/google-signin", {
      "iosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
      "androidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
      "webClientId": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
    }]
  ]
}
```

### Environment Variables
Ensure .env contains Firebase config (already set up):
```
FIREBASE_API_KEY=***
FIREBASE_AUTH_DOMAIN=***
FIREBASE_PROJECT_ID=***
```

## Error Handling

### Google Sign-In Errors
- `auth/popup-closed-by-user` → "Sign-in was cancelled" + Retry option
- `auth/popup-blocked` → "Sign-in popup was blocked by browser"
- `auth/cancelled-popup-request` → "Sign-in request was cancelled"
- Network error → Show offline notice, retry when online
- Invalid token → Force full re-auth flow

### Session Errors
- Token refresh fails offline → Serve cached read-only session
- User re-auth fails → Prompt again with retry option
- Session timeout during write → Alert + force re-auth

## Testing Checklist

✓ User can complete sign-up in <10 seconds from app open
✓ Firestore /users doc contains NO email or phone fields
✓ Display name shown to others is user-edited, not Google account name
✓ Re-auth prompt appears after 30-min timeout for sensitive actions
✓ Sign-out clears all local session data
✓ Permission denial shows friendly error + retry option
✓ Offline token refresh fails, serves cached session for reads
✓ Missing Google photo falls back to generated avatar
✓ Same user gets same avatar across different devices
✓ 30-min timeout resets after each re-auth
✓ Silent re-auth succeeds on app open (normal case)
✓ Silent re-auth fails gracefully if token expired

## Next Steps

1. **Integrate @react-native-google-signin/google-signin**
   - Install package
   - Configure OAuth credentials
   - Replace placeholder Google Sign-In button with native implementation

2. **Add Firestore Security Rules**
   - Restrict /users/{uid} to user-only writes
   - Allow public read of displayName, avatarUrl, bio
   - Deny email/phone field reads for all users

3. **Test Full Flow**
   - First-time sign-up
   - Subsequent app opens (silent re-auth)
   - Sensitive action re-auth prompts
   - Offline scenarios
   - Sign-out and clear data

4. **Integrate with Protected Actions**
   - Update circle.service.ts to use executeProtectedAction() for removeMember
   - Update invite.service.ts for revokeInvite
   - Ensure all sensitive operations check session timeout

5. **Monitor and Analytics**
   - Track sign-up completion time
   - Monitor re-auth success rate
   - Log offline session uses
   - Track error occurrence rates
