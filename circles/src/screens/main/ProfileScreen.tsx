import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '../../services/firebase';
import { removePushToken } from '../../services/notification.service';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface NotificationPrefs {
  messages: boolean;
  planReminders: boolean;
}

/**
 * ProfileScreen - User profile and settings
 */
export default function ProfileScreen() {
  const user = auth.currentUser;
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    messages: true,
    planReminders: true,
  });
  const [upiId, setUpiId] = useState<string>('');
  const [savingPref, setSavingPref] = useState<string | null>(null);

  // Load notification preferences from Firestore on mount
  useEffect(() => {
    const loadPrefs = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const prefs = userDoc.data()?.notificationPrefs;
        if (prefs) {
          setNotifPrefs({
            messages: prefs.messages !== false,
            planReminders: prefs.planReminders !== false,
          });
        }
        const userUpiId = userDoc.data()?.upiId;
        if (userUpiId) {
          setUpiId(userUpiId);
        }
      } catch (error) {
        console.error('Error loading notification prefs:', error);
      }
    };
    loadPrefs();
  }, [user]);

  const handleTogglePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;
    // Optimistic update
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    setSavingPref(key);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        [`notificationPrefs.${key}`]: value,
      });
    } catch (error) {
      console.error(`Error saving ${key} pref:`, error);
      // Revert on failure
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSavingPref(null);
    }
  };

  const handleSaveUpiId = async () => {
    if (!user) return;
    setSavingPref('upiId');
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        upiId: upiId.trim(),
      });
    } catch (error) {
      console.error('Error saving UPI ID:', error);
    } finally {
      setSavingPref(null);
    }
  };

  const handleSignOut = async () => {
    try {
      // Remove device push token before signing out so this device
      // stops receiving notifications immediately
      if (user) {
        await removePushToken(user.uid);
      }
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email || 'No email'}</Text>
        <Text style={styles.userId}>ID: {user?.uid?.slice(0, 8)}...</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in the next update.')}
        >
          <Text style={styles.menuItemText}>Edit Profile</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available in the next update.')}
        >
          <Text style={styles.menuItemText}>Privacy</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>UPI ID</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., name@okicici"
              placeholderTextColor={Colors.textTertiary}
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveUpiId}
              disabled={savingPref === 'upiId'}
            >
              {savingPref === 'upiId' ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.toggleSubtext}>
            Required for others to settle up with you automatically.
          </Text>
        </View>
      </View>

      {/* ── Notification Settings ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.toggleItem}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.menuItemText}>Message Notifications</Text>
            <Text style={styles.toggleSubtext}>
              Alerts for new messages in your circles
            </Text>
          </View>
          {savingPref === 'messages' ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={notifPrefs.messages}
              onValueChange={(v) => handleTogglePref('messages', v)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          )}
        </View>

        <View style={styles.toggleItem}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.menuItemText}>Plan Reminders</Text>
            <Text style={styles.toggleSubtext}>
              Reminders for upcoming plans and RSVPs
            </Text>
          </View>
          {savingPref === 'planReminders' ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={notifPrefs.planReminders}
              onValueChange={(v) => handleTogglePref('planReminders', v)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Support', 'Please email support@circlesapp.com for assistance.')}
        >
          <Text style={styles.menuItemText}>Help & Support</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Terms of Service', 'View our terms at circlesapp.com/terms')}
        >
          <Text style={styles.menuItemText}>Terms of Service</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Privacy Policy', 'View our privacy policy at circlesapp.com/privacy')}
        >
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Text style={styles.menuItemArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Circles App v1.0.0</Text>
      </View>
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.surface,
  },
  email: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userId: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  menuItemArrow: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textTertiary,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: Colors.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.surface,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
});
