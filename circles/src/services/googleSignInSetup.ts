/**
 * Google Sign-In Configuration & Setup
 * 
 * Initialize Google Sign-In with OAuth credentials
 * Must be called once on app startup before any sign-in attempts
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

export const initializeGoogleSignIn = async (): Promise<void> => {
  try {
    const iosClientId = Constants.expoConfig?.extra?.googleClientIds?.ios;
    const androidClientId = Constants.expoConfig?.extra?.googleClientIds?.android;
    const webClientId = Constants.expoConfig?.extra?.googleClientIds?.web;

    // Warn if credentials not configured
    if (!iosClientId || !androidClientId || !webClientId) {
      console.warn(
        'Google Sign-In credentials not fully configured. ' +
        'Please set OAuth client IDs in app.json extra.googleClientIds'
      );
    }

    GoogleSignin.configure({
      webClientId,
      iosClientId,
      androidClientId,
      offlineAccess: true,
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true,
    });

    console.log('✓ Google Sign-In configured successfully');
  } catch (error: any) {
    console.error('✗ Google Sign-In configuration error:', error);
    throw new Error(`Failed to configure Google Sign-In: ${error.message}`);
  }
};

/**
 * Check if user is already signed in
 */
export const isUserSignedIn = async (): Promise<boolean> => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    return isSignedIn;
  } catch (error) {
    console.error('Error checking sign-in status:', error);
    return false;
  }
};

/**
 * Get current signed-in user info
 */
export const getCurrentUser = async () => {
  try {
    const userInfo = await GoogleSignin.getCurrentUser();
    return userInfo;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Sign out from Google
 */
export const signOutGoogleSDK = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
    console.log('✓ Signed out from Google');
  } catch (error: any) {
    console.error('Error signing out from Google:', error);
    throw error;
  }
};

/**
 * Revoke access token
 */
export const revokeGoogleAccess = async (): Promise<void> => {
  try {
    await GoogleSignin.revokeAccess();
    console.log('✓ Google access revoked');
  } catch (error: any) {
    console.error('Error revoking Google access:', error);
    throw error;
  }
};
