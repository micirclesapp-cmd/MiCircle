# Google OAuth Setup Guide

## Quick Start

The native Google Sign-In library is now fully integrated. To complete the setup, you need to get OAuth credentials from Google Cloud Console and configure them in your app.

## Step 1: Get OAuth Credentials

### Option A: Google Cloud Console (Recommended for Production)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API:
   - Search for "Google+ API"
   - Click Enable
4. Go to "Credentials" → Create OAuth 2.0 Client ID
5. Create THREE separate credentials:

#### iOS Credentials
- Application type: iOS
- Bundle ID: `com.circles.app`
- Save the Client ID (ends with `.apps.googleusercontent.com`)

#### Android Credentials
- Application type: Android
- Package name: `com.circles.app`
- Get SHA-1 fingerprint:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- Enter the SHA-1 fingerprint
- Save the Client ID

#### Web Credentials
- Application type: Web application
- Authorized JavaScript origins: `http://localhost:3000` (for development)
- Authorized redirect URIs: `http://localhost:3000/callback`
- Save the Client ID

### Option B: Firebase Console (Faster for Development)

1. Go to https://console.firebase.google.com/
2. Select your Circles project
3. Go to Authentication → Sign-in method
4. Enable Google
5. It auto-generates client IDs (but you still need to configure in app.json manually)

## Step 2: Configure app.json

Edit `circles/app.json` and replace the placeholders:

```json
{
  "expo": {
    "plugins": [
      ["@react-native-google-signin/google-signin", {
        "iosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
        "androidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
        "webClientId": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
      }]
    ],
    "extra": {
      "googleClientIds": {
        "ios": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
        "android": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
        "web": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
      }
    }
  }
}
```

## Step 3: Test Locally

### Android
```bash
cd circles
npm run android
```

Tap "Sign In with Google" on the login screen. A native Google Sign-In dialog should appear.

### iOS
```bash
cd circles
npm run ios
```

Tap "Sign In with Google". On first launch, iOS may prompt for OAuth configuration verification.

## Step 4: Build for Production

### With EAS (Recommended)

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Build (Advanced)

```bash
# Android
cd android
./gradlew assembleRelease

# iOS
xcodebuild -scheme circles -configuration Release -archivePath build/circles.xcarchive archive
```

## Troubleshooting

### "GoogleSignin is not configured"
- **Cause**: OAuth credentials not set in app.json
- **Fix**: Follow Step 2 above with real client IDs

### "Invalid Client ID"
- **Cause**: Client ID doesn't match app package/bundle
- **Fix**: 
  - Verify bundle ID: `com.circles.app` (iOS) and package: `com.circles.app` (Android)
  - Get new credentials from Google Console for correct bundle/package

### "Network error during sign-in"
- **Cause**: No internet connection or firewall blocking
- **Fix**: Check device network connectivity

### Native dialog not appearing
- **Cause**: SDK not initialized or credentials invalid
- **Fix**: 
  - Check RootNavigator logs for initialization errors
  - Verify app.json configuration

### "WEBVIEW_SIGNIN_ERROR"
- **Cause**: OAuth credentials not configured in Google Console
- **Fix**: Complete Step 1 and get proper credentials

## Environment Variables (Optional)

If you want to use environment variables instead of hardcoding in app.json:

1. Create `.env.production`:
```
GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

2. Update `app.json` to read from environment:
```json
{
  "extra": {
    "googleClientIds": {
      "ios": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
      "android": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
      "web": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
    }
  }
}
```

## Testing the Full Flow

1. **First Sign-Up**
   - Tap "Sign In with Google"
   - Authorize with your Google account
   - Enter display name
   - Select avatar
   - Add bio
   - Verify user created in Firestore (no email field)

2. **App Re-Open** (Silent Re-Auth)
   - Close app completely
   - Reopen app
   - Should go directly to home (no sign-in screen)
   - Check logs for "✓ Google Sign-In configured"

3. **Sensitive Action** (After 30+ minutes)
   - Try to remove a circle member
   - Should see "Verify Your Identity" alert
   - Re-authenticate with Google
   - Action proceeds

4. **Sign-Out**
   - Tap Sign Out from Settings
   - Session cleared
   - Returns to GoogleSignInScreen

## Security Checklist

✓ OAuth credentials protected (never commit to git)
✓ Email never exposed in Firestore
✓ Phone number never collected
✓ Session timeout enforced (30 min)
✓ Offline write attempts blocked
✓ Token refresh handled automatically

## Next Steps After Setup

1. Get real OAuth credentials from Google Cloud Console
2. Update app.json with credentials
3. Test on iOS and Android
4. Deploy to production with EAS
5. Monitor sign-up success rates
6. Track authentication errors
7. Collect user feedback

## Support

For issues with Google Sign-In library:
- GitHub: https://github.com/react-native-google-signin/google-signin
- Docs: https://react-native-google-signin.web.app/

For issues with Firebase Auth:
- Docs: https://firebase.google.com/docs/auth/

For Circles-specific issues:
- Check RootNavigator logs
- Verify app.json configuration
- Check Firestore security rules
