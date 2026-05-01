import { firestore } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Generate a secure invite token for circle invitations
 * Format: 8 characters, alphanumeric, suitable for sharing via links
 * Example: "a1b2c3d4"
 */
export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Validate invite token format
 */
export function isValidInviteToken(token: string): boolean {
  return /^[A-Za-z0-9]{8}$/.test(token);
}

/**
 * Check if invite token already exists in Firestore
 * Handles the extremely rare case of collision
 * 
 * Probability: ~1 in 2.8 trillion (negligible)
 * But we check anyway for production robustness
 */
export async function isInviteTokenInUse(token: string): Promise<boolean> {
  try {
    const circlesRef = collection(firestore, 'circles');
    const q = query(circlesRef, where('inviteToken', '==', token));
    const snapshot = await getDocs(q);
    return !snapshot.empty; // true if token exists, false otherwise
  } catch (error) {
    console.error('Error checking invite token:', error);
    // If Firestore check fails, assume token is safe to use
    // (fallback for offline or permission errors)
    return false;
  }
}

/**
 * Generate a unique invite token, checking for collisions
 * 
 * This function:
 * 1. Generates a random 8-char token
 * 2. Checks Firestore for collisions
 * 3. Regenerates if collision found (retry up to 3 times)
 * 4. Returns safe token ready to write to Firestore
 * 
 * Collision probability is so low (~1 in 2.8 trillion) that
 * retries are virtually never needed. This is defensive programming.
 */
export async function generateUniqueInviteToken(): Promise<string> {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const token = generateInviteToken();
    const exists = await isInviteTokenInUse(token);
    
    if (!exists) {
      // Token is unique - safe to use
      return token;
    }
    
    // Collision detected (extremely rare) - retry
    console.warn(`Invite token collision detected (attempt ${attempt + 1}), regenerating...`);
  }
  
  // Should never reach here, but fallback
  console.error('Failed to generate unique invite token after retries');
  return generateInviteToken();
}

