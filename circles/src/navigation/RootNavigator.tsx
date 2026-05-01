import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { NotificationProvider } from '../components/shared/NotificationProvider';
import { configureNotificationHandlers, setNavigationRef } from '../services/notification.service';
import { ActivityIndicator, View, Text } from 'react-native';

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Configure the single canonical notification handler once at startup
  useEffect(() => {
    configureNotificationHandlers();
  }, []);

  useEffect(() => {
    console.log('RootNavigator: Setting up auth listener');

    const timeout = setTimeout(() => {
      console.warn('RootNavigator: Auth timeout - proceeding without user');
      setIsLoading(false);
      setUser(null);
    }, 3000);

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          console.log('RootNavigator: Auth state changed', currentUser?.uid);
          setUser(currentUser as any);
          setIsLoading(false);
          clearTimeout(timeout);
        },
        (error) => {
          console.error('RootNavigator: Auth error', error);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      );

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#333', fontSize: 14 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Wire the global navigation ref for deep-linking from killed/background state
        if (navigationRef.current) {
          setNavigationRef(navigationRef.current);
        }
      }}
    >
      {/* NotificationProvider must be inside NavigationContainer so useNavigation() works */}
      <NotificationProvider />

      {user ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
