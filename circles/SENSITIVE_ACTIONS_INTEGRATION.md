/**
 * SENSITIVE ACTIONS INTEGRATION GUIDE
 * 
 * How to use executeProtectedAction() for operations requiring 30-min re-auth
 */

import { executeProtectedAction, SENSITIVE_ACTIONS } from '../utils/protectedActions';

/**
 * EXAMPLE 1: Remove Circle Member
 * 
 * File: src/services/circle.service.ts
 */
export const removeCircleMemberWithProtection = async (
  circleId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> => {
  return executeProtectedAction(
    async () => {
      // Your existing removeMember logic here
      const result = await removeMemberFromCircle(circleId, memberId);
      return result;
    },
    SENSITIVE_ACTIONS.REMOVE_CIRCLE_MEMBER
  );
};

/**
 * EXAMPLE 2: Revoke Invite
 * 
 * File: src/services/invite.service.ts
 */
export const revokeInviteWithProtection = async (
  circleId: string,
  inviteId: string
): Promise<{ success: boolean; error?: string }> => {
  return executeProtectedAction(
    async () => {
      const result = await revokeInvite(circleId, inviteId);
      return result;
    },
    SENSITIVE_ACTIONS.REVOKE_INVITE
  );
};

/**
 * EXAMPLE 3: Delete Circle
 * 
 * File: src/services/circle.service.ts
 */
export const deleteCircleWithProtection = async (
  circleId: string
): Promise<{ success: boolean; error?: string }> => {
  return executeProtectedAction(
    async () => {
      const result = await deleteCircle(circleId);
      return result;
    },
    SENSITIVE_ACTIONS.DELETE_CIRCLE
  );
};

/**
 * EXAMPLE 4: In Component (CircleSettingsScreen)
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';

export const useCircleSettings = (circleId: string) => {
  const handleRemoveMember = useCallback(async (memberId: string) => {
    const result = await removeCircleMemberWithProtection(circleId, memberId);
    
    if (result.success) {
      Alert.alert('Success', 'Member removed from circle');
    } else {
      Alert.alert('Error', result.error || 'Failed to remove member');
    }
  }, [circleId]);

  const handleDeleteCircle = useCallback(async () => {
    Alert.alert(
      'Delete Circle?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteCircleWithProtection(circleId);
            if (result.success) {
              Alert.alert('Success', 'Circle deleted');
              navigation.goBack();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete circle');
            }
          },
        },
      ]
    );
  }, [circleId]);

  return {
    handleRemoveMember,
    handleDeleteCircle,
  };
};

/**
 * INTEGRATION CHECKLIST
 * 
 * For each sensitive operation:
 * 
 * ✓ 1. Create wrapper function in service file
 * ✓ 2. Wrap your existing function with executeProtectedAction()
 * ✓ 3. Pass appropriate SENSITIVE_ACTION constant
 * ✓ 4. Update all callers to use wrapper function
 * ✓ 5. Test locally:
 *      - Immediate action (session valid) → should proceed
 *      - After 30+ min idle → should show re-auth alert
 *      - After re-auth → should proceed with action
 * ✓ 6. Test edge cases:
 *      - User cancels re-auth → action should abort
 *      - Network error during re-auth → graceful error message
 * 
 */

/**
 * SENSITIVE OPERATIONS REQUIRING 30-MIN RE-AUTH
 * 
 * Add to these as more features are implemented:
 * 
 * - Remove circle member
 * - Revoke invite
 * - Delete circle
 * - Transfer ownership
 * - Leave circle
 * - Delete message
 * - Ban user (moderation)
 * - Create poll (might be sensitive in future)
 * - Change circle settings
 * - Update circle photo
 * 
 */

/**
 * MIGRATION GUIDE
 * 
 * Step 1: Find all sensitive operations
 * ```bash
 * grep -r "removeMember\|revokeInvite\|deleteCircle" src/
 * ```
 * 
 * Step 2: For each function, create wrapper:
 * ```typescript
 * export const funcNameWithProtection = async (...args) => {
 *   return executeProtectedAction(
 *     () => originalFunc(...args),
 *     SENSITIVE_ACTIONS.ACTION_NAME
 *   );
 * };
 * ```
 * 
 * Step 3: Update imports in components:
 * ```typescript
 * // Old
 * import { removeMember } from '../services/circle.service';
 * removeMember(circleId, memberId);
 * 
 * // New
 * import { removeCircleMemberWithProtection } from '../services/circle.service';
 * removeCircleMemberWithProtection(circleId, memberId);
 * ```
 * 
 * Step 4: Test each operation:
 * - Wait 30 minutes
 * - Trigger sensitive action
 * - Verify re-auth prompt appears
 * 
 */

/**
 * TESTING SCRIPT
 * 
 * To test 30-min timeout without waiting:
 * 
 * 1. Open Firebase Console
 * 2. Go to Firestore
 * 3. Find your user document at /users/{uid}
 * 4. Edit sessionTimestamp to 30+ minutes ago:
 *    sessionTimestamp: Date.now() - (31 * 60 * 1000)
 * 5. Try removing a member
 * 6. Should show "Verify Your Identity" alert
 * 
 */
