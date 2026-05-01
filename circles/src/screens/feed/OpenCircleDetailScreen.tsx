import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, increment } from 'firebase/firestore';
import { firestore, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import type { OpenCircle } from '../../types/feed.types';
import { TransitBookingBanner } from '../../components/feed/TransitBookingBanner';
import { SimpleChatView } from '../../components/chat/SimpleChatView';
import { trackCircleJoin } from '../../services/analytics.service';

type FeedStackParamList = {
  OpenCircleDetailScreen: { circleId: string };
};

type OpenCircleDetailScreenRouteProp = RouteProp<
  FeedStackParamList,
  'OpenCircleDetailScreen'
>;

const TRANSIT_ICONS: Record<string, string> = {
  train: '🚂',
  flight: '✈️',
  bus: '🚌',
};

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

export const OpenCircleDetailScreen: React.FC = () => {
  const route = useRoute<OpenCircleDetailScreenRouteProp>();
  const navigation = useNavigation();
  const { circleId } = route.params;

  const [circle, setCircle] = useState<OpenCircle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'info'>('chat');

  const currentUserUid = auth.currentUser?.uid || '';
  const isMember = circle?.members.includes(currentUserUid);

  useEffect(() => {
    if (!circleId) return;

    const circleRef = doc(firestore, 'public_circles', circleId);
    const unsubscribe = onSnapshot(
      circleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCircle({ id: snapshot.id, ...snapshot.data() } as OpenCircle);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching circle:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [circleId]);

  const handleJoin = async () => {
    if (!circle || !currentUserUid) return;

    try {
      const circleRef = doc(firestore, 'public_circles', circleId);
      
      if (circle.joinMode === 'approval') {
        // Request to join - add to joinRequests array
        await updateDoc(circleRef, {
          joinRequests: arrayUnion(currentUserUid),
        });
        Alert.alert(
          'Request Sent',
          'Your request to join has been sent to the circle creator. You\'ll be notified when they respond.'
        );
      } else {
        // Open circle - join immediately
        await updateDoc(circleRef, {
          members: arrayUnion(currentUserUid),
          memberCount: increment(1),
          // Track join timestamp for velocity calculation
          memberJoinTimestamps: arrayUnion({
            uid: currentUserUid,
            timestamp: Date.now(),
          }),
        });
        
        // Track join for category affinity
        await trackCircleJoin(circleId, 'open', circle.category);
        
        Alert.alert('Success', 'You\'ve joined the circle! 🎉');
      }
    } catch (error) {
      console.error('Error joining circle:', error);
      Alert.alert('Error', 'Failed to join circle. Please try again.');
    }
  };

  const handleLeave = async () => {
    if (!circle || !currentUserUid) return;

    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const circleRef = doc(firestore, 'public_circles', circleId);
              await updateDoc(circleRef, {
                members: arrayRemove(currentUserUid),
                memberCount: circle.memberCount - 1,
              });
              navigation.goBack();
            } catch (error) {
              console.error('Error leaving circle:', error);
              Alert.alert('Error', 'Failed to leave circle. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!circle) return;

    const shareUrl = `https://circles.app/open/${circleId}`;
    const shareMessage = `Check out this circle on Circles!\n\n${circle.name}\n${circle.pitch}\n\nJoin here: ${shareUrl}`;

    try {
      await Share.share({
        message: shareMessage,
        title: `Join ${circle.name}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getTransitCountdown = () => {
    if (!circle?.transitDate) return null;

    const now = new Date();
    const transitDate = new Date(circle.transitDate);
    const diff = transitDate.getTime() - now.getTime();

    if (diff < 0) {
      return 'Journey completed';
    } else if (diff < 24 * 60 * 60 * 1000) {
      return 'Journey in progress';
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `Journey in ${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  const shouldShowBookingBanner = () => {
    if (!circle?.transitDate) return false;

    // Only show for future dates (not archived)
    const now = new Date();
    const transitDate = new Date(circle.transitDate);
    if (transitDate < now) return false;

    // Don't show if user is already a member (they presumably have a ticket)
    if (isMember) return false;

    return true;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Circle not found</Text>
      </View>
    );
  }

  const renderChatTab = () => {
    if (!isMember) {
      const hasRequested = circle?.joinRequests?.includes(currentUserUid);
      
      return (
        <View style={styles.previewBanner}>
          <Text style={styles.previewText}>
            {hasRequested 
              ? 'Your request to join is pending approval' 
              : 'Join this circle to participate in the chat'}
          </Text>
          {!hasRequested && (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
              <Text style={styles.joinButtonText}>
                {circle?.joinMode === 'approval' ? 'Request to Join' : 'Join Circle'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return <SimpleChatView circleId={circleId} circleType="public" />;
  };

  const renderInfoTab = () => (
    <ScrollView style={styles.infoContainer}>
      {/* Full Pitch */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>About</Text>
        <Text style={styles.pitchText}>{circle.pitch}</Text>
      </View>

      {/* Context Detail */}
      {circle.transitMode && circle.transitRoute && circle.transitDate && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Transit Info</Text>
          <View style={styles.transitCard}>
            <Text style={styles.transitIcon}>
              {TRANSIT_ICONS[circle.transitMode]}
            </Text>
            <View style={styles.transitDetails}>
              <Text style={styles.transitRoute}>
                {circle.transitRoute} {circle.transitMode === 'train' ? 'Train' : circle.transitMode === 'flight' ? 'Flight' : 'Bus'}
              </Text>
              <Text style={styles.transitDate}>
                {new Date(circle.transitDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.transitCountdown}>{getTransitCountdown()}</Text>
            </View>
          </View>
          {/* Transit Booking Banner */}
          {shouldShowBookingBanner() && (
            <TransitBookingBanner
              transitMode={circle.transitMode}
              transitRoute={circle.transitRoute}
              transitDate={circle.transitDate}
              circleId={circle.id}
            />
          )}
        </View>
      )}

      {circle.location && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Location</Text>
          <Text style={styles.locationText}>📍 {circle.location}</Text>
        </View>
      )}

      {/* Tags */}
      {circle.tags.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {circle.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Creator Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Creator</Text>
        <View style={styles.creatorCard}>
          <Image
            source={{ uri: circle.creatorAvatar || 'https://via.placeholder.com/48' }}
            style={styles.creatorAvatar}
          />
          <View>
            <Text style={styles.creatorName}>{circle.creatorName}</Text>
            <Text style={styles.creatorJoinYear}>
              Member since {circle.creatorJoinYear}
            </Text>
          </View>
        </View>
      </View>

      {/* Members List */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>
          Members ({circle.memberCount})
        </Text>
        <View style={styles.membersContainer}>
          {circle.members.slice(0, 20).map((memberId, index) => (
            <View key={index} style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>
                {memberId.charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
          {circle.memberCount > 20 && (
            <View style={styles.memberAvatar}>
              <Text style={styles.memberMore}>+{circle.memberCount - 20}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.circleName} numberOfLines={2}>
              {circle.name}
            </Text>
            <View style={styles.headerMeta}>
              <Text style={styles.memberCount}>👥 {circle.memberCount}</Text>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: CATEGORY_COLORS[circle.category] },
                ]}
              >
                <Text style={styles.categoryBadgeText}>
                  {circle.category.charAt(0).toUpperCase() + circle.category.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          {isMember && (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.menuButton} onPress={handleShare}>
                <Text style={styles.menuIcon}>↗️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuButton} onPress={handleLeave}>
                <Text style={styles.menuIcon}>⋮</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isMember && (
            <TouchableOpacity style={styles.menuButton} onPress={handleShare}>
              <Text style={styles.menuIcon}>↗️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
              Info
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'chat' ? renderChatTab() : renderInfoTab()}

      {/* Floating Join Button for non-members */}
      {!isMember && !circle.joinRequests?.includes(currentUserUid) && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity style={styles.floatingJoinButton} onPress={handleJoin}>
            <Text style={styles.floatingJoinButtonText}>
              {circle.joinMode === 'approval' ? 'Request to Join' : 'Join Circle'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.surface,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  previewBanner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  previewText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  joinButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  infoContainer: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  pitchText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  transitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transitIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  transitDetails: {
    flex: 1,
  },
  transitRoute: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  transitDate: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  transitCountdown: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  locationText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  creatorJoinYear: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  memberMore: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  floatingJoinButton: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  floatingJoinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
});

export default OpenCircleDetailScreen;
