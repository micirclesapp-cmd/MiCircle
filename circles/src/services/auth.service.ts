import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  reauthenticateWithPopup,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, firestore, storage } from './firebase';

/**
 * Authentication Service
 * 
 * Handles user authentication and profile management
 * Primary auth method: Google Sign-In (no phone numbers or exposed emails)
 */

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Create user document in Firestore
    await setDoc(doc(firestore, `users/${user.uid}`), {
      uid: user.uid,
      email: user.email,
      displayName,
      photoURL: null,
      bio: '',
      createdAt: serverTimestamp(),
      subscription: 'free',
      onboardingCompleted: false,
    });

    console.log('User signed up:', user.uid);

    return { success: true };
  } catch (error: any) {
    console.error('Sign up error:', error);

    let errorMessage = 'Failed to create account';

    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email is already in use';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in:', userCredential.user.uid);

    return { success: true };
  } catch (error: any) {
    console.error('Sign in error:', error);

    let errorMessage = 'Failed to sign in';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Sign out
 */
export const signOutUser = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(auth);
    console.log('User signed out');

    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, error: 'Failed to sign out' };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent');

    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);

    let errorMessage = 'Failed to send reset email';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Update user display name
 */
export const updateDisplayName = async (
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Update Firebase Auth profile
    await updateProfile(user, { displayName });

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      displayName,
      updatedAt: serverTimestamp(),
    });

    console.log('Display name updated');

    return { success: true };
  } catch (error: any) {
    console.error('Update display name error:', error);
    return { success: false, error: 'Failed to update display name' };
  }
};

/**
 * Update user bio
 */
export const updateBio = async (
  bio: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      bio,
      updatedAt: serverTimestamp(),
    });

    console.log('Bio updated');

    return { success: true };
  } catch (error: any) {
    console.error('Update bio error:', error);
    return { success: false, error: 'Failed to update bio' };
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (
  uri: string
): Promise<{ success: boolean; photoURL?: string; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
    await uploadBytes(storageRef, blob);

    // Get download URL
    const photoURL = await getDownloadURL(storageRef);

    // Update Firebase Auth profile
    await updateProfile(user, { photoURL });

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      photoURL,
      updatedAt: serverTimestamp(),
    });

    console.log('Profile photo uploaded');

    return { success: true, photoURL };
  } catch (error: any) {
    console.error('Upload profile photo error:', error);
    return { success: false, error: 'Failed to upload photo' };
  }
};

/**
 * Delete profile photo
 */
export const deleteProfilePhoto = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Delete from Firebase Storage
    const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
    try {
      await deleteObject(storageRef);
    } catch (error) {
      // Ignore if file doesn't exist
      console.log('Profile photo not found in storage');
    }

    // Update Firebase Auth profile
    await updateProfile(user, { photoURL: null });

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      photoURL: null,
      updatedAt: serverTimestamp(),
    });

    console.log('Profile photo deleted');

    return { success: true };
  } catch (error: any) {
    console.error('Delete profile photo error:', error);
    return { success: false, error: 'Failed to delete photo' };
  }
};

/**
 * Update email address
 */
export const updateUserEmail = async (
  newEmail: string,
  currentPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update email
    await updateEmail(user, newEmail);

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      email: newEmail,
      updatedAt: serverTimestamp(),
    });

    console.log('Email updated');

    return { success: true };
  } catch (error: any) {
    console.error('Update email error:', error);

    let errorMessage = 'Failed to update email';

    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email is already in use';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Update password
 */
export const updateUserPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    console.log('Password updated');

    return { success: true };
  } catch (error: any) {
    console.error('Update password error:', error);

    let errorMessage = 'Failed to update password';

    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect current password';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'New password is too weak';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Delete user document from Firestore
    await deleteDoc(doc(firestore, `users/${user.uid}`));

    // Delete profile photo from Storage
    try {
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await deleteObject(storageRef);
    } catch (error) {
      // Ignore if file doesn't exist
      console.log('Profile photo not found in storage');
    }

    // Delete user account
    await deleteUser(user);

    console.log('User account deleted');

    return { success: true };
  } catch (error: any) {
    console.error('Delete account error:', error);

    let errorMessage = 'Failed to delete account';

    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Get user profile data
 */
export const getUserProfile = async (
  uid: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const userDoc = await getDoc(doc(firestore, `users/${uid}`));

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: userDoc.data() };
  } catch (error: any) {
    console.error('Get user profile error:', error);
    return { success: false, error: 'Failed to get user profile' };
  }
};

/**
 * Mark onboarding as completed
 */
export const completeOnboarding = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    await updateDoc(doc(firestore, `users/${user.uid}`), {
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    });

    console.log('Onboarding completed');

    return { success: true };
  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    return { success: false, error: 'Failed to complete onboarding' };
  }
};

/**
 * ========================
 * GOOGLE SIGN-IN METHODS
 * ========================
 */

/**
 * Sign in with Google credential
 * Called after Google OAuth flow returns idToken
 */
export const signInWithGoogle = async (
  idToken: string,
  accessToken: string,
  displayName?: string,
  photoURL?: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    // Check if user document exists in Firestore
    const userDocRef = doc(firestore, `users/${user.uid}`);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // New user: create Firestore document
      // CRITICAL: Do NOT store email or phone numbers
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: displayName || user.displayName || 'User',
        avatarUrl: photoURL || null,
        bio: '',
        createdAt: serverTimestamp(),
        joinedVia: 'google',
        sessionTimestamp: Date.now(),
        lastAuthTime: Date.now(),
        onboardingCompleted: false,
        subscription: 'free',
      });

      console.log('New Google user created:', user.uid);
    } else {
      // Existing user: update session timestamp and last auth time
      await updateDoc(userDocRef, {
        sessionTimestamp: Date.now(),
        lastAuthTime: Date.now(),
        updatedAt: serverTimestamp(),
      });

      console.log('Existing Google user logged in:', user.uid);
    }

    return { success: true, user };
  } catch (error: any) {
    console.error('Google sign-in error:', error);

    let errorMessage = 'Failed to sign in with Google';

    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in was cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Sign-in popup was blocked by browser';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = 'Sign-in request was cancelled';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Silently re-authenticate with stored Google token on app open
 * Returns true if successful, false if token expired or unavailable
 */
export const silentGoogleReAuth = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    // Get fresh ID token
    const idToken = await user.getIdToken(true);
    console.log('Silent Google re-auth successful:', user.uid);

    // Update session timestamp
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      sessionTimestamp: Date.now(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Silent re-auth error:', error);
    return { success: false, error: 'Failed to refresh session' };
  }
};

/**
 * Check if session has exceeded 30-minute timeout for sensitive actions
 */
export const isSessionExpiredForSensitiveAction = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) return true;

    const userDoc = await getDoc(doc(firestore, `users/${user.uid}`));
    if (!userDoc.exists()) return true;

    const sessionTimestamp = userDoc.data()?.sessionTimestamp;
    if (!sessionTimestamp) return true;

    const thirtyMinutesMs = 30 * 60 * 1000;
    const timeSinceLastAuth = Date.now() - sessionTimestamp;

    return timeSinceLastAuth > thirtyMinutesMs;
  } catch (error) {
    console.error('Error checking session expiry:', error);
    return true; // Assume expired on error for security
  }
};

/**
 * Prompt user to re-authenticate with Google for sensitive actions
 */
export const reauthenticateWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(user, provider);

    // Update session timestamp after successful re-auth
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      sessionTimestamp: Date.now(),
      updatedAt: serverTimestamp(),
    });

    console.log('Re-authentication successful:', user.uid);
    return { success: true };
  } catch (error: any) {
    console.error('Re-authentication error:', error);

    let errorMessage = 'Failed to re-authenticate';

    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Re-authentication was cancelled';
    } else if (error.code === 'auth/user-mismatch') {
      errorMessage = 'You signed in with a different account';
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Sign out user and clear all cached session data
 */
export const signOutGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;

    if (user) {
      // Clear session data in Firestore
      await updateDoc(doc(firestore, `users/${user.uid}`), {
        sessionTimestamp: null,
        lastAuthTime: null,
        updatedAt: serverTimestamp(),
      });
    }

    // Sign out from Firebase
    await signOut(auth);
    console.log('User signed out successfully');

    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, error: 'Failed to sign out' };
  }
};

/**
 * Update user display name (confirmed by user during onboarding)
 */
export const updateDisplayNameGoogle = async (
  displayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Update Firebase Auth profile
    await updateProfile(user, { displayName });

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      displayName,
      updatedAt: serverTimestamp(),
    });

    console.log('Display name updated:', displayName);
    return { success: true };
  } catch (error: any) {
    console.error('Update display name error:', error);
    return { success: false, error: 'Failed to update display name' };
  }
};

/**
 * Update user avatar URL
 */
export const updateAvatarUrl = async (
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Update Firestore document
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      avatarUrl,
      updatedAt: serverTimestamp(),
    });

    console.log('Avatar URL updated');
    return { success: true };
  } catch (error: any) {
    console.error('Update avatar URL error:', error);
    return { success: false, error: 'Failed to update avatar' };
  }
};

/**
 * Get cached session for offline read-only mode
 * Returns null if no valid cached session exists
 */
export const getCachedSessionData = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    const userDoc = await getDoc(doc(firestore, `users/${user.uid}`));
    if (!userDoc.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    return { success: true, data: userDoc.data() };
  } catch (error: any) {
    console.error('Error getting cached session:', error);
    return { success: false, error: 'Failed to get session data' };
  }
};
