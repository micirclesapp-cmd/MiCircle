import { create } from 'zustand';

/**
 * Auth Store - Temporary user data during onboarding + session management
 * 
 * Onboarding state is cleared after user completes onboarding and Firestore doc is created.
 * Session state tracks authentication timestamp for 30-minute re-auth timeout on sensitive actions.
 */
interface AuthStoreState {
  // Onboarding data (temporary)
  displayName: string;
  avatarUrl: string;
  bio: string;
  userIntent: 'circles' | 'feed' | 'both' | null;

  // Onboarding completion tracking
  onboardingCompleted: boolean;
  lastCompletedStep: 'displayName' | 'avatar' | 'bio' | 'intent' | null;

  // Session management
  sessionTimestamp: number | null;
  lastAuthTime: number | null;
  isOfflineMode: boolean;
  cachedProfile: any | null;

  // Setters for onboarding
  setDisplayName: (displayName: string) => void;
  setAvatarUrl: (avatarUrl: string) => void;
  setBio: (bio: string) => void;
  setUserIntent: (intent: 'circles' | 'feed' | 'both') => void;
  setLastCompletedStep: (step: 'displayName' | 'avatar' | 'bio' | 'intent') => void;

  // Setters for session management
  updateSessionTimestamp: (timestamp: number) => void;
  updateLastAuthTime: (timestamp: number) => void;
  setOfflineMode: (isOffline: boolean) => void;
  setCachedProfile: (profile: any) => void;

  // Clear (called after Firestore doc is created)
  reset: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  // Onboarding state
  displayName: '',
  avatarUrl: '',
  bio: '',
  userIntent: null,

  // Onboarding completion tracking
  onboardingCompleted: false,
  lastCompletedStep: null,

  // Session state
  sessionTimestamp: null,
  lastAuthTime: null,
  isOfflineMode: false,
  cachedProfile: null,

  // Onboarding setters
  setDisplayName: (displayName: string) =>
    set({ displayName }),

  setAvatarUrl: (avatarUrl: string) =>
    set({ avatarUrl }),

  setBio: (bio: string) =>
    set({ bio }),

  setUserIntent: (intent: 'circles' | 'feed' | 'both') =>
    set({ userIntent: intent }),

  setLastCompletedStep: (step: 'displayName' | 'avatar' | 'bio' | 'intent') =>
    set({ lastCompletedStep: step }),

  // Session setters
  updateSessionTimestamp: (timestamp: number) =>
    set({ sessionTimestamp: timestamp }),

  updateLastAuthTime: (timestamp: number) =>
    set({ lastAuthTime: timestamp }),

  setOfflineMode: (isOffline: boolean) =>
    set({ isOfflineMode: isOffline }),

  setCachedProfile: (profile: any) =>
    set({ cachedProfile: profile }),

  // Clear onboarding data
  reset: () =>
    set({
      displayName: '',
      avatarUrl: '',
      bio: '',
      userIntent: null,
      onboardingCompleted: false,
      lastCompletedStep: null,
    }),

  // Clear session data
  clearSession: () =>
    set({
      sessionTimestamp: null,
      lastAuthTime: null,
      isOfflineMode: false,
      cachedProfile: null,
    }),
}));
