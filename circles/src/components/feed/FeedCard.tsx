import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { doc, updateDoc, increment, addDoc, collection, query, where, getDocs, runTransaction, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import type { OpenCircle } from '../../types/feed.types';
import { TransitBookingBanner } from './TransitBookingBanner';

interface FeedCardProps {
  circle: OpenCircle;
  onJoin: () => void;
  onReport: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  travel: '#3498DB',
  fitness: '#2ECC71',
  music: '#9B59B6',
  food: '#FF6B35',
  hobby: '#E67E22',
  neighbourhood: '#1ABC9C',
  professional: '#34495E',
  other: '#95A5A6',
};

const TRANSIT_ICONS: Record<string, string> = {
  train: '🚂',
  flight: '✈️',
  bus: '🚌',
};

export const FeedCard: React.FC<FeedCardProps> = ({ circle, onJoin, onReport }) => {
  const [expanded, setExpanded] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [joining, setJoining] = useState(false);
  
  const [isPending, setIsPending] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  const currentUserUid = auth.currentUser?.uid || '';
  const currentUserDisplayName = auth.currentUser?.displayName || 'A user';
  const isJoined = circle.members?.includes(currentUserUid);

  useEffect(() => {
    const checkJoinRequestStatus = async () => {
      if (!currentUserUid || isJoined || circle.joinMode === 'open') return;
      try {
        const reqRef = doc(firestore, `public_circles/${circle.id}/joinRequests/${currentUserUid}`);
        const reqDoc = await getDoc(reqRef);
        if (reqDoc.exists()) {
          const data = reqDoc.data();
          if (data.status === 'pending') {
            setIsPending(true);
          } else if (data.status === 'declined') {
            // Check 24h cooldown
            const declinedAt = data.updatedAt?.toMillis() || 0;
            const now = Date.now();
            if (now - declinedAt < 24 * 60 * 60 * 1000) {
              setIsOnCooldown(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking join status:', error);
      }
    };
    checkJoinRequestStatus();
  }, [circle.id, currentUserUid, isJoined, circle.joinMode]);

  const shouldShowBookingBanner = () => {
    if (!circle.transitDate) return false;
    const now = new Date();
    const transitDate = new Date(circle.transitDate);
    if (transitDate < now) return false;
    if (isJoined) return false;
    return true;
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://micircles.app/feed/${circle.id}`;
      await Share.share({
        message: `Check out this circle on MiCircles: ${circle.name} ${shareUrl}`,
        url: shareUrl, // iOS specific
        title: circle.name, // Android specific
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleJoin = async () => {
    if (!currentUserUid || joining || isJoined || isPending || isOnCooldown) return;

    if (isOnCooldown) {
      Alert.alert('Please Wait', 'Your previous request was declined. You can try again after 24 hours.');
      return;
    }

    setJoining(true);
    try {
      const circleRef = doc(firestore, 'public_circles', circle.id);

      if (circle.joinMode === 'open') {
        // F-10: Atomic Join Transaction
        await runTransaction(firestore, async (transaction) => {
          const cDoc = await transaction.get(circleRef);
          if (!cDoc.exists()) throw new Error('Circle not found');
          const data = cDoc.data() as OpenCircle;
          
          if (data.maxMembers && data.memberCount >= data.maxMembers) {
            throw new Error('Circle is full');
          }
          if (data.members.includes(currentUserUid)) {
            throw new Error('Already a member');
          }

          const newMembers = [...data.members, currentUserUid];
          transaction.update(circleRef, {
            members: newMembers,
            memberCount: increment(1)
          });
        });

        // Add system message to chat
        const messagesRef = collection(firestore, `public_circles/${circle.id}/messages`);
        await addDoc(messagesRef, {
          text: `${currentUserDisplayName} joined the circle`,
          isSystem: true,
          createdAt: serverTimestamp(),
          senderId: 'system'
        });

        Alert.alert('Joined!', `You're now part of ${circle.name}`);
        onJoin();
      } else {
        // F-10: Approval Mode Join Request
        const reqRef = doc(firestore, `public_circles/${circle.id}/joinRequests/${currentUserUid}`);
        await setDoc(reqRef, {
          uid: currentUserUid,
          name: currentUserDisplayName,
          avatarUrl: auth.currentUser?.photoURL || '',
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        setIsPending(true);
        Alert.alert('Request Sent', 'The creator will review your request');
      }

    } catch (error: any) {
      console.error('Error joining circle:', error);
      if (error.message === 'Circle is full') {
        Alert.alert('Sorry', 'This circle has reached its maximum member limit.');
      } else {
        Alert.alert('Error', 'Failed to join circle. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleReport = async (reason: string) => {
    if (!currentUserUid) return;

    // F-12 prevent self-reporting
    if (circle.creatorUid === currentUserUid) {
      Alert.alert('Notice', 'You cannot report your own circle.');
      setShowReportSheet(false);
      return;
    }

    try {
      // Write report to Firestore
      const reportsRef = collection(firestore, 'reports');
      await addDoc(reportsRef, {
        cardId: circle.id,
        reporterUid: currentUserUid,
        reason,
        timestamp: Date.now(),
      });

      // F-12 Auto-hide check
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const q = query(
        reportsRef,
        where('cardId', '==', circle.id),
        where('timestamp', '>', twentyFourHoursAgo)
      );
      const snapshot = await getDocs(q);

      if (snapshot.size >= 5) {
        // Auto-hide the card
        const circleRef = doc(firestore, 'public_circles', circle.id);
        await updateDoc(circleRef, {
          isHidden: true,
        });
      }

      Alert.alert('Report Submitted', "We'll review this within 48 hours.");
      setShowReportSheet(false);
      onReport();
    } catch (error) {
      console.error('Error reporting card:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const renderReportSheet = () => {
    if (!showReportSheet) return null;

    const reportOptions = [
      { label: 'Spam', value: 'spam' },
      { label: 'Inappropriate content', value: 'inappropriate' },
      { label: 'Misleading', value: 'misleading' },
      { label: 'Harassment', value: 'harassment' },
    ];

    return (
      <View style={styles.reportSheet}>
        <View style={styles.reportSheetContent}>
          <Text style={styles.reportSheetTitle}>Report this circle</Text>
          {reportOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.reportOption}
              onPress={() => handleReport(option.value)}
            >
              <Text style={styles.reportOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.reportCancelButton}
            onPress={() => setShowReportSheet(false)}
          >
            <Text style={styles.reportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const pitchText = expanded ? circle.pitch : circle.pitch?.slice(0, 100) || '';
  const needsExpansion = circle.pitch && circle.pitch.length > 100;

  return (
    <>
      <View style={styles.card}>
        {/* Top Row: Category Tag + Time + Share */}
        <View style={styles.topRow}>
          <View
            style={[
              styles.categoryTag,
              { backgroundColor: CATEGORY_COLORS[circle.category] || Colors.textTertiary },
            ]}
          >
            <Text style={styles.categoryText}>
              {circle.category.charAt(0).toUpperCase() + circle.category.slice(1)}
            </Text>
          </View>
          <View style={styles.topRightActions}>
            <Text style={styles.timeText}>{getTimeAgo(circle.createdAt)}</Text>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Text style={styles.shareIcon}>🔗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title Row: Name + Member Count */}
        <View style={styles.titleRow}>
          <Text style={styles.circleName} numberOfLines={2}>
            {circle.name}
          </Text>
          <Text style={styles.memberCount}>👥 {circle.memberCount}</Text>
        </View>

        {/* Creator Row */}
        <View style={styles.creatorRow}>
          <Image
            source={{ uri: circle.creatorAvatar || 'https://via.placeholder.com/32' }}
            style={styles.avatar}
          />
          <Text style={styles.creatorText}>
            {circle.creatorName} · Member since {circle.creatorJoinYear}
          </Text>
          {circle.transitMode && circle.transitRoute && circle.transitDate && (
            <Text style={styles.transitInfo}>
              {TRANSIT_ICONS[circle.transitMode]} {circle.transitRoute} · {new Date(circle.transitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          )}
        </View>

        {/* Pitch Text */}
        <View style={styles.pitchContainer}>
          <Text style={styles.pitchText}>
            {pitchText}
            {needsExpansion && !expanded && '...'}
          </Text>
          {needsExpansion && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.moreButton}>{expanded ? 'less' : 'more'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Context Detail */}
        {circle.location && (
          <Text style={styles.contextText}>📍 {circle.location}</Text>
        )}
        {circle.transitMode && circle.transitRoute && circle.transitDate && (
          <Text style={styles.contextText}>
            {TRANSIT_ICONS[circle.transitMode]} {circle.transitRoute} {circle.transitMode === 'train' ? 'Train' : circle.transitMode === 'flight' ? 'Flight' : 'Bus'} · {new Date(circle.transitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
          </Text>
        )}

        {/* Transit Booking Banner */}
        {shouldShowBookingBanner() && circle.transitMode && circle.transitRoute && circle.transitDate && (
          <View style={styles.bookingBannerContainer}>
            <TransitBookingBanner
              transitMode={circle.transitMode}
              transitRoute={circle.transitRoute}
              transitDate={circle.transitDate}
              circleId={circle.id}
            />
          </View>
        )}

        {/* Tags Row */}
        {circle.tags && circle.tags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {circle.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Bottom Row: Report + Join Button */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setShowReportSheet(true)}
          >
            <Text style={styles.reportIcon}>⚠</Text>
            <Text style={styles.reportText}>Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.joinButton,
              isJoined && styles.joinButtonJoined,
              isPending && styles.joinButtonPending,
              isOnCooldown && styles.joinButtonCooldown,
              (circle.joinMode === 'approval' && !isJoined && !isPending && !isOnCooldown) && styles.joinButtonOutline,
            ]}
            onPress={handleJoin}
            disabled={isJoined || isPending || joining || isOnCooldown}
          >
            <Text
              style={[
                styles.joinButtonText,
                (isJoined || isPending || isOnCooldown) && styles.joinButtonTextDisabled,
                (circle.joinMode === 'approval' && !isJoined && !isPending && !isOnCooldown) && styles.joinButtonTextOutline,
              ]}
            >
              {isJoined ? 'Joined ✓' : isPending ? 'Requested...' : isOnCooldown ? 'Declined' : circle.joinMode === 'open' ? 'Join' : 'Request to Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderReportSheet()}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    marginLeft: 12,
    padding: 4,
  },
  shareIcon: {
    fontSize: 16,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.surface,
  },
  timeText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  circleName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  memberCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  creatorText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  transitInfo: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  pitchContainer: {
    marginBottom: 12,
  },
  pitchText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  moreButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  contextText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  bookingBannerContainer: {
    marginBottom: 12,
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tag: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  tagText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportIcon: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  reportText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  joinButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinButtonOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  joinButtonJoined: {
    backgroundColor: Colors.surfaceAlt,
  },
  joinButtonPending: {
    backgroundColor: Colors.surfaceAlt,
  },
  joinButtonCooldown: {
    backgroundColor: Colors.border,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.surface,
  },
  joinButtonTextOutline: {
    color: Colors.success,
  },
  joinButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  reportSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  reportSheetContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  reportSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  reportOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reportOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  reportCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
