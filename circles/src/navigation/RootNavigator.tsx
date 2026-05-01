import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../services/firebase';
import { initializeGoogleSignIn } from '../services/googleSignInSetup';
import { doc, getDoc } from 'firebase/firestore';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { ActivityIndicator, View, Text, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/auth.store';
import { getScreenForStep } from '../utils/onboardingUtils';

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [onboardingState, setOnboardingState] = useState<{
    completed: boolean;
    lastStep: string | null;
  } | null>(null);
  const navigationRef = React.useRef(null);

  useEffect(() => {
    console.log('RootNavigator: Initializing...');
    
    // Initialize Google Sign-In first
    initializeGoogleSignIn()
      .then(() => {
        console.log('✓ Google Sign-In initialized');
      })
      .catch((error) => {
        console.error('✗ Google Sign-In init failed:', error);
      });

    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('RootNavigator: Auth timeout - proceeding without user');
      setIsLoading(false);
      setUser(null);
    }, 3000);
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log('RootNavigator: Auth state changed', currentUser?.uid);
        setUser(currentUser);

        // Check onboarding status if user exists
        if (currentUser?.uid) {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setOnboardingState({
                completed: data?.onboardingCompleted === true,
                lastStep: data?.lastCompletedStep || null,
              });
              console.log('✓ Onboarding status loaded:', data?.onboardingCompleted);
            } else {
              // New user - not in Firestore yet
              setOnboardingState({
                completed: false,
                lastStep: null,
              });
            }
          } catch (error) {
            console.error('Error loading onboarding status:', error);
            setOnboardingState({
              completed: false,
              lastStep: null,
            });
          }
        }

        setIsLoading(false);
        clearTimeout(timeout);
      }, (error) => {
        console.error('RootNavigator: Auth error', error);
        setIsLoading(false);
        clearTimeout(timeout);
      });

      return () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('RootNavigator: Setup error', error);
      setIsLoading(false);
      clearTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      console.log('Deep link received:', url);

      // Handle open circle links: https://circles.app/open/{circleId}
      if (url.includes('/open/')) {
        const circleId = url.split('/open/')[1].split('?')[0];
        if (navigationRef.current && user) {
          // @ts-ignore
          navigationRef.current.navigate('Feed', {
            screen: 'OpenCircleDetailScreen',
            params: { circleId },
          });
        }
      }

      // Handle invite circle links: https://circles.app/join/{inviteCode}
      if (url.includes('/join/')) {
        const inviteCode = url.split('/join/')[1].split('?')[0];
        if (navigationRef.current && user) {
          console.log('Join circle invite received:', inviteCode);
          // Navigate to join circle flow
          // @ts-ignore
          navigationRef.current.navigate('Circles', {
            screen: 'JoinCircleScreen',
            params: { inviteCode },
          });
        }
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#333', fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!user ? (
        <AuthNavigator />
      ) : onboardingState?.completed ? (
        <MainTabNavigator />
      ) : (
        // User is authenticated but onboarding incomplete - resume onboarding
        <OnboardingResumeNavigator resumeStep={onboardingState?.lastStep} />
      )}
    </NavigationContainer>
  );
}

/**
 * Temporary navigator that resumes onboarding from the last completed step
 */
function OnboardingResumeNavigator({ resumeStep }: { resumeStep: string | null }) {
  const { createNativeStackNavigator } = require('@react-navigation/native-stack');
  const Stack = createNativeStackNavigator();

  const DisplayNameScreen = require('../screens/auth/DisplayNameScreen').default;
  const AvatarScreen = require('../screens/auth/AvatarScreen').default;
  const BioScreen = require('../screens/auth/BioScreen').default;
  const IntentScreen = require('../screens/auth/IntentScreen').default;
  const { Routes } = require('../constants/routes');

  // Determine which screen to start from
  const initialScreen = getScreenForStep(resumeStep as any) || 'DisplayName';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: { backgroundColor: '#fff' },
      }}
      initialRouteName={initialScreen}
    >
      <Stack.Screen name={Routes.DISPLAY_NAME} component={DisplayNameScreen} />
      <Stack.Screen name={Routes.AVATAR} component={AvatarScreen} />
      <Stack.Screen name={Routes.BIO} component={BioScreen} />
      <Stack.Screen name={Routes.INTENT} component={IntentScreen} />
    </Stack.Navigator>
  );
}
