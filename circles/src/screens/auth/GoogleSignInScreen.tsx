import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Routes } from '../../constants/routes';
import Svg, { Circle } from 'react-native-svg';
import { signInWithGoogle } from '../../services/auth.service';
import { getPresetAvatarForUser, getInitials } from '../../utils/avatarUtils';

/**
 * CirclesLogo
 */
const CirclesLogo = () => {
  const circleRadius = 25;
  return (
    <Svg width="80" height="80" viewBox="0 0 80 80">
      <Circle cx="23" cy="40" r={circleRadius} fill={Colors.primary} />
      <Circle cx="57" cy="40" r={circleRadius} fill={Colors.primary} />
      <Circle cx="40" cy="23" r={circleRadius} fill={Colors.primary} />
    </Svg>
  );
};

/**
 * GoogleSignInScreen - Native Google OAuth Sign-In
 * 
 * Users sign in via native Google OAuth in one tap.
 * No email or phone numbers are stored in the app.
 * This is the ONLY authentication method for the MVP.
 */
export default function GoogleSignInScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In on component mount
    configureGoogleSignIn();
  }, []);

  const configureGoogleSignIn = async () => {
    try {
      GoogleSignin.configure();
      setIsConfigured(true);
      console.log('✓ Google Sign-In configured');
    } catch (err) {
      console.error('Google Sign-In config error:', err);
      setError('Failed to configure Google Sign-In. Please check your OAuth credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      Alert.alert('Error', 'Google Sign-In is not configured. Please restart the app.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Initiating Google Sign-In...');

      // Sign in with Google
      const response = await GoogleSignin.signIn();

      if (!response?.data) {
        setError('Invalid response from Google Sign-In');
        return;
      }

      const { idToken, serverAuthCode } = response.data;

      if (!idToken) {
        setError('Failed to get authentication token from Google');
        return;
      }

      console.log('✓ Google Sign-In successful');
      console.log('User:', response.user?.name);

      // Call our Firebase auth service
      const result = await signInWithGoogle(
        idToken,
        serverAuthCode || '',
        response.user?.name,
        response.user?.photo
      );

      if (result.success && result.user) {
        console.log('✓ Firebase authentication successful');

        // Store tokens for silent re-auth
        try {
          await SecureStore.setItemAsync('googleIdToken', idToken);
          if (serverAuthCode) {
            await SecureStore.setItemAsync('googleServerAuthCode', serverAuthCode);
          }
        } catch (err) {
          console.warn('Failed to store auth tokens:', err);
        }

        // Navigate to display name screen for onboarding
        navigation.navigate(Routes.DISPLAY_NAME);
      } else {
        setError(result.error || 'Firebase authentication failed');
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);

      let errorMessage = 'Failed to sign in with Google';
      let showRetry = true;

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign-in was cancelled';
        showRetry = false;
      } else if (err.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign-in is already in progress';
        showRetry = false;
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available on this device';
      } else if (err.code === 'WEBVIEW_NETWORK_ERROR') {
        errorMessage = 'Network error during sign-in. Please check your connection.';
      } else if (err.code === 'WEBVIEW_SIGNIN_ERROR') {
        errorMessage = 'OAuth credentials not configured. Please check app.json.';
      }

      setError(errorMessage);

      if (showRetry) {
        Alert.alert('Sign-In Error', errorMessage, [
          {
            text: 'Retry',
            onPress: handleGoogleSignIn,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <CirclesLogo />
            <Text style={styles.tagline}>
              Connect with people you know.{'\n'}Discover people you haven't met yet.
            </Text>
          </View>

          {/* Sign-In Section */}
          <View style={styles.signInSection}>
            <Text style={styles.title}>
              Sign In with Google
            </Text>

            <Text style={styles.subtitle}>
              One-tap sign-in. Your phone number is never collected or shared.
            </Text>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Google Sign-In Button */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={loading || !isConfigured}
              style={[
                styles.googleButton,
                (loading || !isConfigured) && styles.googleButtonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.surface} size="small" />
              ) : (
                <Text style={styles.googleButtonText}>
                  🔐 Sign In with Google
                </Text>
              )}
            </TouchableOpacity>

            {/* Configuration Warning */}
            {!isConfigured && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  ⚠️ OAuth credentials not configured. Please set your Google OAuth client IDs in app.json
                </Text>
              </View>
            )}

            {/* Privacy Notice */}
            <View style={styles.privacyContainer}>
              <Text style={styles.privacyText}>
                We never collect or share your phone number. Your Google email is used only for authentication and is never shared with other users.
              </Text>
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  logoSection: {
    flex: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  tagline: {
    marginTop: 24,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.lg,
  },
  signInSection: {
    flex: 0.5,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#92400E',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium as any,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
  googleButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: Colors.surface,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold as any,
  },
  privacyContainer: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  privacyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  logoSection: {
    flex: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  tagline: {
    marginTop: 24,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.lg,
  },
  signInSection: {
    flex: 0.5,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
  },
  googleButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: Colors.surface,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold as any,
  },
  privacyContainer: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  privacyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
});

        {/* Auth Button */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={[
            styles.authButton,
            loading && styles.authButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.authButtonText}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle Sign In/Sign Up */}
        <TouchableOpacity
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError('');
            setPassword('');
          }}
          disabled={loading}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  logoSection: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tagline: {
    marginTop: 20,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.lg,
  },
  formSection: {
    flex: 0.6,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium as any,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginBottom: 16,
    fontWeight: Typography.fontWeight.medium as any,
  },
  authButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  authButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    opacity: 0.5,
  },
  authButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.surface,
  },
  toggleButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium as any,
  },
});
