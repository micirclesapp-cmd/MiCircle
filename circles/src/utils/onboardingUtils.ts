/**
 * Onboarding Utilities
 * 
 * Handles onboarding step tracking, resumption, and progress persistence.
 * Allows users to resume from where they left off if they close the app mid-onboarding.
 */

import { firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type OnboardingStep = 'displayName' | 'avatar' | 'bio' | 'intent';

export const OnboardingSteps = {
  DISPLAY_NAME: 'displayName' as const,
  AVATAR: 'avatar' as const,
  BIO: 'bio' as const,
  INTENT: 'intent' as const,
};

export const StepSequence: OnboardingStep[] = [
  OnboardingSteps.DISPLAY_NAME,
  OnboardingSteps.AVATAR,
  OnboardingSteps.BIO,
  OnboardingSteps.INTENT,
];

/**
 * Get the next screen route based on the completed step
 */
export function getNextScreenForStep(step: OnboardingStep | null): string {
  if (!step) return 'DisplayName';
  
  const stepIndex = StepSequence.indexOf(step);
  if (stepIndex === -1 || stepIndex >= StepSequence.length - 1) {
    return 'Intent';
  }
  
  const nextStep = StepSequence[stepIndex + 1];
  
  switch (nextStep) {
    case OnboardingSteps.DISPLAY_NAME:
      return 'DisplayName';
    case OnboardingSteps.AVATAR:
      return 'Avatar';
    case OnboardingSteps.BIO:
      return 'Bio';
    case OnboardingSteps.INTENT:
      return 'Intent';
    default:
      return 'Intent';
  }
}

/**
 * Get the screen route to resume from a given step
 */
export function getScreenForStep(step: OnboardingStep | null): string {
  if (!step) return 'DisplayName';
  
  switch (step) {
    case OnboardingSteps.DISPLAY_NAME:
      return 'DisplayName';
    case OnboardingSteps.AVATAR:
      return 'Avatar';
    case OnboardingSteps.BIO:
      return 'Bio';
    case OnboardingSteps.INTENT:
      return 'Intent';
    default:
      return 'DisplayName';
  }
}

/**
 * Fetch onboarding status from Firestore
 * Returns { onboardingCompleted, lastCompletedStep }
 */
export async function fetchOnboardingStatus(uid: string): Promise<{
  onboardingCompleted: boolean;
  lastCompletedStep: OnboardingStep | null;
} | null> {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    
    return {
      onboardingCompleted: data?.onboardingCompleted === true,
      lastCompletedStep: data?.lastCompletedStep || null,
    };
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return null;
  }
}

/**
 * Check if user has already completed onboarding
 */
export async function hasCompletedOnboarding(uid: string): Promise<boolean> {
  try {
    const status = await fetchOnboardingStatus(uid);
    return status?.onboardingCompleted === true;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Estimate time to complete onboarding (in seconds)
 * Based on step completion
 */
export function estimateTimeToComplete(currentStep: OnboardingStep | null): number {
  // Rough estimates for each step:
  // - DisplayName: ~5 seconds
  // - Avatar: ~10 seconds (with preset selection)
  // - Bio: ~0 seconds (can be skipped)
  // - Intent: ~3 seconds
  // Total: ~18 seconds (well under 60 second target)

  let remaining = 0;
  let foundCurrent = !currentStep;

  for (const step of StepSequence) {
    if (step === currentStep) {
      foundCurrent = true;
    }

    if (foundCurrent) {
      switch (step) {
        case OnboardingSteps.DISPLAY_NAME:
          remaining += 5;
          break;
        case OnboardingSteps.AVATAR:
          remaining += 10;
          break;
        case OnboardingSteps.BIO:
          remaining += 0; // Can skip
          break;
        case OnboardingSteps.INTENT:
          remaining += 3;
          break;
      }
    }
  }

  return remaining;
}

/**
 * Determine which screen to show on app open
 * - If not authenticated: SplashScreen → GoogleSignIn
 * - If authenticated + completed onboarding: MainTabNavigator
 * - If authenticated + mid-onboarding: Resume from lastCompletedStep
 */
export function getInitialAuthScreen(
  isAuthenticated: boolean,
  onboardingCompleted: boolean,
  lastCompletedStep: OnboardingStep | null
): string {
  if (!isAuthenticated) {
    return 'Splash';
  }

  if (onboardingCompleted) {
    return 'MainTabs'; // This will be handled by RootNavigator
  }

  // Resume from where they left off
  return getScreenForStep(lastCompletedStep);
}
