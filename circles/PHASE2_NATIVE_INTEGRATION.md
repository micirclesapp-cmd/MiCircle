# Phase 2: Native Google Sign-In Integration

## Overview
F-01 core implementation is complete. This document outlines the remaining work to fully enable native Google Sign-In on iOS and Android.

## Current State
- ✅ Google OAuth service functions written (`signInWithGoogle()`, `silentGoogleReAuth()`, etc.)
- ✅ Session management implemented (30-min timeout tracking)
- ✅ GoogleSignInScreen UI created (placeholder for native button)
- ✅ Protected actions wrapper ready for sensitive operations
- ❌ Native Google Sign-In library NOT integrated
- ❌ OAuth credentials NOT configured
- ❌ Native button NOT showing real Google Sign-In

## What Needs To Be Done

### 1. Install Native Library
```bash
npm install @react-native-google-signin/google-signin
```

### 2. Get OAuth Credentials
1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → Create OAuth 2.0 Client IDs
5. Create THREE client IDs:
   - iOS: iOS app bundle identifier `com.circles.app`
   - Android: Android app package `com.circles.app`
   - Web: Web application (for any web deployment)

6. Save these credentials:
   ```
   iOS Client ID: ____________________
   Android Client ID: ____________________
   Web Client ID: ____________________
   ```

### 3. Configure app.json

Add to `circles/app.json` under `expo.plugins`:

```json
{
  "expo": {
    ...existing config...,
    "plugins": [
      ...existing plugins...,
      ["@react-native-google-signin/google-signin", {
        "iosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
        "androidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
        "webClientId": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
      }]
    ]
  }
}
```

### 4. Update GoogleSignInScreen.tsx

Replace the placeholder logic with actual native integration:

```typescript
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Inside GoogleSignInScreen component:

const handleGoogleSignIn = async () => {
  try {
    setLoading(true);
    setError('');

    // Configure the SDK (usually done once on app start, but doing here for safety)
    GoogleSignin.configure();

    // Sign in
    const response = await GoogleSignin.signIn();
    
    if (response?.data?.idToken && response?.data?.serverAuthCode) {
      const idToken = response.data.idToken;
      const accessToken = response.data.serverAuthCode;
      const displayName = response?.user?.name;
      const photoURL = response?.user?.photo;

      // Call our auth service
      const result = await signInWithGoogle(
        idToken,
        accessToken,
        displayName,
        photoURL
      );

      if (result.success) {
        // Navigation handled by RootNavigator detecting auth state change
        navigation.navigate(Routes.DISPLAY_NAME);
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } else {
      setError('Invalid response from Google Sign-In');
    }
  } catch (err: any) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled sign-in');
      // User cancelled, no error shown
    } else if (err.code === statusCodes.IN_PROGRESS) {
      setError('Sign-in is already in progress');
    } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      setError('Google Play Services not available');
    } else {
      setError(err.message || 'Failed to sign in with Google');
    }
  } finally {
    setLoading(false);
  }
};
```

### 5. Create App Startup Configuration

Create `src/config/googleSignIn.ts`:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

export const initializeGoogleSignIn = () => {
  try {
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId,
      iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
      androidClientId: Constants.expoConfig?.extra?.googleAndroidClientId,
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
    console.log('GoogleSignIn configured successfully');
  } catch (error: any) {
    console.error('GoogleSignIn configuration error:', error);
  }
};
```

Call this in App.tsx:
```typescript
import { initializeGoogleSignIn } from './src/config/googleSignIn';

useEffect(() => {
  initializeGoogleSignIn();
}, []);
```

### 6. Add Environment Variables

Update `circles/.env`:
```
GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

Update `circles/app.json` extra section:
```json
{
  "expo": {
    "extra": {
      "googleIosClientId": "YOUR_IOS_CLIENT_ID",
      "googleAndroidClientId": "YOUR_ANDROID_CLIENT_ID",
      "googleWebClientId": "YOUR_WEB_CLIENT_ID"
    }
  }
}
```

### 7. iOS-Specific Setup

1. Open iOS project in Xcode (after building with EAS)
2. Add URL schemes for OAuth redirect:
   - Scheme: `com.googleusercontent.apps.{client-id}`
   - Where `{client-id}` is the iOS client ID prefix

This is usually handled by the expo plugin, but verify in Xcode if needed.

### 8. Android-Specific Setup

1. Get SHA-1 fingerprint of your release keystore:
   ```bash
   keytool -list -v -keystore path/to/keystore.jks -alias your-alias
   ```

2. Add this SHA-1 fingerprint to Android OAuth credential in Google Cloud Console

3. The expo plugin should handle other Android configuration

### 9. Test the Integration

1. Build for iOS:
   ```bash
   eas build --platform ios
   ```

2. Build for Android:
   ```bash
   eas build --platform android
   ```

3. Test sign-up flow:
   - Open app
   - Tap "Sign In with Google"
   - Verify native Google dialog appears
   - Complete Google sign-in
   - Check Firestore: User document created with no email field
   - Verify sessionTimestamp is set
   - Complete onboarding (DisplayName → Avatar → Bio)
   - Verify app shows MainTabNavigator

4. Test subsequent app opens:
   - Close and reopen app
   - Verify silent re-auth succeeds (no sign-in screen shown)
   - Verify user taken directly to home

5. Test sensitive actions (after integration):
   - Try to remove circle member
   - Wait until 30+ minutes since last auth
   - Execute sensitive action
   - Verify re-auth prompt appears

## Firestore Security Rules

After testing, add these security rules to Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only write to their own document
    match /users/{uid} {
      allow read: if request.auth.uid == uid || 
                     resource.data.displayName != null;
      allow write: if request.auth.uid == uid;
      allow delete: if request.auth.uid == uid;
      
      // Private fields - never expose email or phone
      allow read: if false { "email": null, "phone": null };
    }
    
    // Circles and other collections can reference users by uid
    match /circles/{circleId} {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

## Troubleshooting

### "GoogleSignin is not configured"
- Ensure `initializeGoogleSignIn()` is called before GoogleSignInScreen renders
- Check that app.json has correct plugin configuration

### "Invalid Client ID"
- Verify OAuth credentials are correct
- Check bundle identifier matches (com.circles.app)
- Verify credentials are for same Google Cloud project

### Native dialog not appearing
- Check iOS URL schemes are configured
- On Android, verify SHA-1 fingerprint is added to Google Console
- Try clearing app cache and rebuilding

### Token refresh fails
- Check network connection
- Verify Firebase project is configured correctly
- Check that offlineAccess: true in GoogleSignin.configure()

## Timeline

- **Phase 2a** (1-2 hours): Get OAuth credentials, configure app.json
- **Phase 2b** (1-2 hours): Integrate native Google Sign-In button
- **Phase 2c** (1 hour): iOS/Android specific setup
- **Phase 2d** (2-3 hours): Testing and validation
- **Phase 2e** (30 min): Add Firestore security rules

**Total**: ~6-9 hours

## Success Criteria

✓ Native Google Sign-In button appears in GoogleSignInScreen
✓ First-time users can sign up in <10 seconds
✓ Firestore user document created with NO email field
✓ User-edited display name stored and shown correctly
✓ Subsequent app opens trigger silent re-auth
✓ 30-min session timeout enforced for sensitive actions
✓ Sign-out clears all session data
✓ Offline mode shows cached circles (read-only)
✓ All error scenarios handled with user-friendly messages

## Post-Integration

After Phase 2 is complete, the F-01 feature will be DONE. No further work needed for MVP launch.

The next features to implement would be:
- F-02: Circle Creation & Management
- F-03: Open Circles Discovery
- F-04: Direct Messaging
- etc.
