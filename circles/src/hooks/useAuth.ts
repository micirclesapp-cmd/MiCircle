import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '../services/firebase';
import { useAuthStore } from '../store/auth.store';

interface UserProfile {
  uid: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string;
  subscription?: 'free' | 'plus';
  onboardingCompleted?: boolean;
  createdAt?: any;
  joinedVia?: 'google';
  sessionTimestamp?: number;
  lastAuthTime?: number;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  sessionExpired?: boolean;
}

/**
 * Hook for authentication state
 * 
 * Provides current user and profile data
 * Tracks session timestamp for 30-minute re-auth timeout on sensitive actions
 */
export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
    sessionExpired: false,
  });

  const updateSessionTimestamp = useAuthStore((state) => state.updateSessionTimestamp);
  const updateLastAuthTime = useAuthStore((state) => state.updateLastAuthTime);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        setState((prev) => ({
          ...prev,
          user,
          loading: !user, // Keep loading if user exists (waiting for profile)
        }));

        if (!user) {
          setState((prev) => ({
            ...prev,
            profile: null,
            loading: false,
          }));
        }
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error,
          loading: false,
        }));
      }
    );

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!state.user) return;

    // Listen to profile changes
    const unsubscribeProfile = onSnapshot(
      doc(firestore, `users/${state.user.uid}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const profileData = snapshot.data() as UserProfile;

          // Update session store with Firestore values
          if (profileData.sessionTimestamp) {
            updateSessionTimestamp(profileData.sessionTimestamp);
          }
          if (profileData.lastAuthTime) {
            updateLastAuthTime(profileData.lastAuthTime);
          }

          // Check if session has expired for sensitive actions
          const thirtyMinutesMs = 30 * 60 * 1000;
          const timeSinceLastAuth = Date.now() - (profileData.sessionTimestamp || Date.now());
          const sessionExpired = timeSinceLastAuth > thirtyMinutesMs;

          setState((prev) => ({
            ...prev,
            profile: profileData,
            loading: false,
            sessionExpired,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            profile: null,
            loading: false,
          }));
        }
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error,
          loading: false,
        }));
      }
    );

    return () => unsubscribeProfile();
  }, [state.user, updateSessionTimestamp, updateLastAuthTime]);

  return state;
};

/**
 * Check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { user, loading } = useAuth();
  return !loading && user !== null;
};

/**
 * Check if user has completed onboarding
 */
export const useHasCompletedOnboarding = (): boolean => {
  const { profile, loading } = useAuth();
  return !loading && profile?.onboardingCompleted === true;
};

/**
 * Check if user has Circles+ subscription
 */
export const useHasCirclesPlus = (): boolean => {
  const { profile, loading } = useAuth();
  return !loading && profile?.subscription === 'plus';
};

/**
 * Check if session has expired for sensitive actions (30-min timeout)
 */
export const useIsSessionExpired = (): boolean => {
  const { profile } = useAuth();

  if (!profile?.sessionTimestamp) return true;

  const thirtyMinutesMs = 30 * 60 * 1000;
  const timeSinceLastAuth = Date.now() - profile.sessionTimestamp;

  return timeSinceLastAuth > thirtyMinutesMs;
};
