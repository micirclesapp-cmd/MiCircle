import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface Member {
  uid: string;
  name: string;
}

interface Split {
  uid: string;
  name: string;
  amount: number;
}

interface Plan {
  id: string;
  title: string;
}

interface AddExpenseScreenProps {
  route: {
    params: {
      circleId: string;
    };
  };
  navigation: any;
}

/**
 * Add Expense Screen
 */
export default function AddExpenseScreen({
  route,
  navigation,
}: AddExpenseScreenProps) {
  const { circleId } = route.params;
  const currentUid = auth.currentUser?.uid;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [paidBy, setPaidBy] = useState<string>(currentUid || '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load circle members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const circleDoc = await firestore
          .collection('circles')
          .doc(circleId)
          .get();

        if (circleDoc.exists()) {
          const circleData = circleDoc.data();
          const memberList: Member[] = circleData?.members || [];
          setMembers(memberList);
          
          // Pre-select all members
          setSelectedMembers(memberList.map((m) => m.uid));
        }
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };

    loadMembers();
  }, [circleId]);

  // Load plans
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plansRef = collection(firestore, `circles/${circleId}/plans`);
        const q = query(plansRef);
        const snapshot = await getDocs(q);

        const planList: Plan[] = [];
        snapshot.forEach((doc) => {
          planList.push({
            id: doc.id,
            title: doc.data().title || doc.data().name || 'Untitled Plan',
          });
        });

        setPlans(planList);
      } catch (error) {
        console.error('Error loading plans:', error);
      }
    };

    loadPlans();
  }, [circleId]);

  const toggleMemberSelection = (uid: string) => {
    if (selectedMembers.includes(uid)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== uid));
    } else {
      setSelectedMembers([...selectedMembers, uid]);
    }
  };

  const calculateSplits = (): Split[] => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || selectedMembers.length === 0) return [];

    if (splitType === 'equal') {
      const perPerson = Math.round((amountNum / selectedMembers.length) * 100) / 100;
      let totalCalculated = perPerson * selectedMembers.length;
      let remainder = Math.round((amountNum - totalCalculated) * 100) / 100;

      return selectedMembers.map((uid) => {
        const member = members.find((m) => m.uid === uid);
        let finalAmount = perPerson;
        
        // Add the remainder to the payer's split, or the first person if payer isn't in split
        if (remainder !== 0) {
          if (uid === paidBy || (!selectedMembers.includes(paidBy) && uid === selectedMembers[0])) {
            finalAmount = Math.round((finalAmount + remainder) * 100) / 100;
            remainder = 0; // Only apply once
          }
        }

        return {
          uid,
          name: member?.name || 'Unknown',
          amount: finalAmount,
        };
      });
    } else {
      // Custom splits
      return selectedMembers.map((uid) => {
        const member = members.find((m) => m.uid === uid);
        const customAmount = parseFloat(customSplits[uid] || '0');
        return {
          uid,
          name: member?.name || 'Unknown',
          amount: isNaN(customAmount) ? 0 : customAmount,
        };
      });
    }
  };

  const getRemainingAmount = (): number => {
    if (splitType !== 'custom') return 0;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return 0;

    const allocated = selectedMembers.reduce((sum, uid) => {
      const customAmount = parseFloat(customSplits[uid] || '0');
      return sum + (isNaN(customAmount) ? 0 : customAmount);
    }, 0);

    return Math.round((amountNum - allocated) * 100) / 100;
  };

  const validateExpense = (): boolean => {
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member to split with');
      return false;
    }

    if (splitType === 'custom') {
      const remaining = getRemainingAmount();
      if (Math.abs(remaining) > 0.01) {
        Alert.alert(
          'Error',
          `Amount not fully allocated. ₹${Math.abs(remaining)} remaining`
        );
        return false;
      }
    }

    return true;
  };

  const handleAddExpense = async () => {
    if (!currentUid || !validateExpense()) return;

    setSubmitting(true);

    try {
      const amountNum = parseFloat(amount);
      const splits = calculateSplits();
      const paidByMember = members.find((m) => m.uid === paidBy);

      await addDoc(collection(firestore, `circles/${circleId}/expenses`), {
        amount: amountNum,
        description: description.trim() || null,
        paidByUid: paidBy,
        paidByName: paidByMember?.name || 'Unknown',
        splits,
        planId: selectedPlan,
        createdAt: Date.now(),
      });

      Alert.alert('Success', 'Expense added');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const paidByMember = members.find((m) => m.uid === paidBy);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity onPress={handleAddExpense} disabled={submitting}>
          <Text
            style={[styles.addButton, submitting && styles.addButtonDisabled]}
          >
            {submitting ? 'Adding...' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Amount input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Description input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="What was this for?"
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            maxLength={60}
          />
        </View>

        {/* Paid by picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid By</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.memberPicker}
          >
            {members.map((member) => (
              <TouchableOpacity
                key={member.uid}
                style={[
                  styles.memberChip,
                  paidBy === member.uid && styles.memberChipSelected,
                ]}
                onPress={() => setPaidBy(member.uid)}
              >
                <Text
                  style={[
                    styles.memberChipText,
                    paidBy === member.uid && styles.memberChipTextSelected,
                  ]}
                >
                  {member.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Split between multi-select */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Split Between</Text>
          <View style={styles.memberGrid}>
            {members.map((member) => (
              <TouchableOpacity
                key={member.uid}
                style={[
                  styles.memberGridItem,
                  selectedMembers.includes(member.uid) &&
                    styles.memberGridItemSelected,
                ]}
                onPress={() => toggleMemberSelection(member.uid)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberGridName}>{member.name}</Text>
                {selectedMembers.includes(member.uid) && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Split type toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Split Type</Text>
          <View style={styles.splitTypeToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                splitType === 'equal' && styles.toggleButtonActive,
              ]}
              onPress={() => setSplitType('equal')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  splitType === 'equal' && styles.toggleButtonTextActive,
                ]}
              >
                Equally
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                splitType === 'custom' && styles.toggleButtonActive,
              ]}
              onPress={() => setSplitType('custom')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  splitType === 'custom' && styles.toggleButtonTextActive,
                ]}
              >
                Custom Amounts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom amounts */}
        {splitType === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Custom Amounts</Text>
            {selectedMembers.map((uid) => {
              const member = members.find((m) => m.uid === uid);
              return (
                <View key={uid} style={styles.customSplitRow}>
                  <Text style={styles.customSplitName}>{member?.name}</Text>
                  <View style={styles.customSplitInput}>
                    <Text style={styles.customSplitCurrency}>₹</Text>
                    <TextInput
                      style={styles.customSplitAmount}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      value={customSplits[uid] || ''}
                      onChangeText={(text) =>
                        setCustomSplits({ ...customSplits, [uid]: text })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              );
            })}
            <View style={styles.remainingBox}>
              <Text style={styles.remainingText}>
                ₹{getRemainingAmount()} remaining to allocate
              </Text>
            </View>
          </View>
        )}

        {/* Link to plan */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Link to Plan (Optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.planPicker}
          >
            <TouchableOpacity
              style={[
                styles.planChip,
                selectedPlan === null && styles.planChipSelected,
              ]}
              onPress={() => setSelectedPlan(null)}
            >
              <Text
                style={[
                  styles.planChipText,
                  selectedPlan === null && styles.planChipTextSelected,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planChip,
                  selectedPlan === plan.id && styles.planChipSelected,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                <Text
                  style={[
                    styles.planChipText,
                    selectedPlan === plan.id && styles.planChipTextSelected,
                  ]}
                >
                  {plan.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelButton: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  descriptionInput: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
  },
  memberPicker: {
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  memberChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  memberChipText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  memberChipTextSelected: {
    color: Colors.surface,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberGridItem: {
    width: 80,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  memberGridItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberAvatarText: {
    fontSize: 18,
    color: Colors.surface,
    fontWeight: Typography.fontWeight.bold,
  },
  memberGridName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 12,
    color: Colors.surface,
  },
  splitTypeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  toggleButtonText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  toggleButtonTextActive: {
    color: Colors.primary,
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customSplitName: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  customSplitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  customSplitCurrency: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginRight: 4,
  },
  customSplitAmount: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  remainingBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  remainingText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    textAlign: 'center',
  },
  planPicker: {
    gap: 8,
  },
  planChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  planChipText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  planChipTextSelected: {
    color: Colors.surface,
  },
});
