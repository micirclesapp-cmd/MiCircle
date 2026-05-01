/**
 * Sensitive Action Guards
 * 
 * Utilities to protect sensitive operations (e.g., remove member, revoke invite)
 * with 30-minute session timeout and re-authentication requirement
 */

import { isSessionExpiredForSensitiveAction, reauthenticateWithGoogle } from '../services/auth.service';
import { Alert } from 'react-native';

/**
 * Protected action wrapper
 * 
 * Checks if session is expired and prompts re-auth if needed
 * Only proceeds with action if session is valid or user completes re-auth
 */
export const executeProtectedAction = async (
  action: () => Promise<any>,
  actionName: string = 'This action'
): Promise<{ success: boolean; result?: any; error?: string }> => {
  try {
    // Check if session is expired
    const sessionExpired = await isSessionExpiredForSensitiveAction();

    if (sessionExpired) {
      // Prompt re-authentication
      return new Promise((resolve) => {
        Alert.alert(
          'Verify Your Identity',
          `${actionName} requires verification. Please sign in again to continue.`,
          [
            {
              text: 'Sign In',
              onPress: async () => {
                try {
                  const reAuthResult = await reauthenticateWithGoogle();
                  if (reAuthResult.success) {
                    // Session refreshed, proceed with action
                    const result = await action();
                    resolve({ success: true, result });
                  } else {
                    resolve({
                      success: false,
                      error: reAuthResult.error || 'Re-authentication failed',
                    });
                  }
                } catch (error: any) {
                  resolve({
                    success: false,
                    error: error.message || 'Re-authentication error',
                  });
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                resolve({
                  success: false,
                  error: 'Action cancelled by user',
                });
              },
            },
          ]
        );
      });
    }

    // Session is valid, proceed with action
    const result = await action();
    return { success: true, result };
  } catch (error: any) {
    console.error('Protected action error:', error);
    return {
      success: false,
      error: error.message || 'Action failed',
    };
  }
};

/**
 * List of sensitive actions that require re-auth
 * These should be called within executeProtectedAction
 */
export const SENSITIVE_ACTIONS = {
  REMOVE_CIRCLE_MEMBER: 'Removing a circle member',
  REVOKE_INVITE: 'Revoking an invite',
  DELETE_CIRCLE: 'Deleting a circle',
  TRANSFER_OWNERSHIP: 'Transferring ownership',
  LEAVE_CIRCLE: 'Leaving a circle',
  DELETE_MESSAGE: 'Deleting a message',
  BAN_USER: 'Banning a user',
} as const;
