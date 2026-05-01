import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage, auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 2;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '🎉'];

interface Photo {
  id: string;
  storageUrl: string;
  thumbnailUrl: string;
  uploaderUid: string;
  uploaderName: string;
  caption: string | null;
  reactions: Record<string, string[]>; // emoji -> [uid]
  planId: string | null;
  planName?: string;
  uploadedAt: number;
}

interface CircleMemoryLaneScreenProps {
  route: {
    params: {
      circleId: string;
    };
  };
  navigation: any;
}

/**
 * Full-Screen Photo Viewer
 */
const PhotoViewer: React.FC<{
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onAddReaction: (photoId: string, emoji: string) => void;
  onAddCaption: (photoId: string, caption: string) => void;
  onDownload: (photo: Photo) => void;
}> = ({ photos, initialIndex, onClose, onAddReaction, onAddCaption, onDownload }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const currentUid = auth.currentUser?.uid;

  const currentPhoto = photos[currentIndex];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleAddCaption = () => {
    if (captionText.trim()) {
      onAddCaption(currentPhoto.id, captionText.trim());
      setCaptionText('');
      setShowCaptionInput(false);
    }
  };

  const reactionCounts: Record<string, number> = {};
  Object.entries(currentPhoto.reactions || {}).forEach(([emoji, uids]) => {
    reactionCounts[emoji] = uids.length;
  });

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerContainer}>
        {/* Photo */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowOverlay(!showOverlay)}
          style={styles.photoContainer}
        >
          <Image
            source={{ uri: currentPhoto.storageUrl }}
            style={styles.fullPhoto}
            resizeMode="contain"
          />

          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={() => handleSwipe('right')}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          {currentIndex < photos.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => handleSwipe('left')}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Overlay */}
        {showOverlay && (
          <>
            {/* Top bar */}
            <View style={styles.viewerTopBar}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.photoCounter}>
                {currentIndex + 1} / {photos.length}
              </Text>
              <TouchableOpacity onPress={() => onDownload(currentPhoto)}>
                <Text style={styles.downloadButton}>⬇</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom info */}
            <View style={styles.viewerBottomBar}>
              {/* Uploader and date */}
              <View style={styles.photoInfo}>
                <Text style={styles.uploaderName}>{currentPhoto.uploaderName}</Text>
                <Text style={styles.uploadDate}>
                  {new Date(currentPhoto.uploadedAt).toLocaleDateString()}
                </Text>
                {currentPhoto.planName && (
                  <Text style={styles.planTag}>📌 {currentPhoto.planName}</Text>
                )}
              </View>

              {/* Caption */}
              {currentPhoto.caption ? (
                <View style={styles.captionBox}>
                  <Text style={styles.captionText}>{currentPhoto.caption}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addCaptionButton}
                  onPress={() => setShowCaptionInput(true)}
                >
                  <Text style={styles.addCaptionText}>+ Add caption</Text>
                </TouchableOpacity>
              )}

              {/* Reactions */}
              <View style={styles.reactionsRow}>
                {EMOJI_REACTIONS.map((emoji) => {
                  const count = reactionCounts[emoji] || 0;
                  const userReacted = currentPhoto.reactions[emoji]?.includes(currentUid || '');

                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.reactionButton,
                        userReacted && styles.reactionButtonActive,
                      ]}
                      onPress={() => onAddReaction(currentPhoto.id, emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {count > 0 && (
                        <Text style={styles.reactionCount}>{count}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Caption input modal */}
        {showCaptionInput && (
          <View style={styles.captionInputOverlay}>
            <View style={styles.captionInputBox}>
              <Text style={styles.captionInputTitle}>Add Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor={Colors.textTertiary}
                value={captionText}
                onChangeText={setCaptionText}
                maxLength={100}
                multiline
                autoFocus
              />
              <View style={styles.captionInputButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCaptionInput(false);
                    setCaptionText('');
                  }}
                >
                  <Text style={styles.captionCancelButton}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddCaption}>
                  <Text style={styles.captionSaveButton}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

/**
 * Memory Lane Screen - Shared photo gallery
 */
export default function CircleMemoryLaneScreen({
  route,
  navigation,
}: CircleMemoryLaneScreenProps) {
  const { circleId } = route.params;
  const currentUid = auth.currentUser?.uid;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedPlan, setSelectedPlan] = useState<string>('All Plans');
  const [plans, setPlans] = useState<any[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Load photos
  useEffect(() => {
    const photosRef = collection(firestore, `circles/${circleId}/memories`);
    const q = query(photosRef, orderBy('uploadedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photoList: Photo[] = [];
      snapshot.forEach((doc) => {
        photoList.push({
          id: doc.id,
          ...doc.data(),
        } as Photo);
      });

      setPhotos(photoList);
      setFilteredPhotos(photoList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [circleId]);

  // Load plans for filter
  useEffect(() => {
    const plansRef = collection(firestore, `circles/${circleId}/plans`);
    const q = query(plansRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const planList: any[] = [];
      snapshot.forEach((doc) => {
        planList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setPlans(planList);
    });

    return () => unsubscribe();
  }, [circleId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...photos];

    // Month filter
    if (selectedMonth !== 'All') {
      filtered = filtered.filter((photo) => {
        const photoMonth = new Date(photo.uploadedAt).toLocaleDateString('en-US', {
          month: 'short',
        });
        return photoMonth === selectedMonth;
      });
    }

    // Plan filter
    if (selectedPlan !== 'All Plans') {
      filtered = filtered.filter((photo) => photo.planId === selectedPlan);
    }

    setFilteredPhotos(filtered);
  }, [selectedMonth, selectedPlan, photos]);

  const getMonths = (): string[] => {
    const months = new Set<string>();
    photos.forEach((photo) => {
      const month = new Date(photo.uploadedAt).toLocaleDateString('en-US', {
        month: 'short',
      });
      months.add(month);
    });
    return ['All', ...Array.from(months)];
  };

  const handleUploadPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handleChooseFromLibrary();
          }
        }
      );
    } else {
      Alert.alert('Upload Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handleChooseFromLibrary },
      ]);
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 100) {
      Alert.alert('Limit Reached', 'Free circles are limited to 100 photos. Upgrade to Circles+ to upload more!');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (photos.length >= 100) {
      Alert.alert('Limit Reached', 'Free circles are limited to 100 photos. Upgrade to Circles+ to upload more!');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required');
      return;
    }

    const remainingSlots = 100 - photos.length;
    const maxSelection = Math.min(10, remainingSlots);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxSelection,
      quality: 0.8,
    });

    if (!result.canceled) {
      for (const asset of result.assets) {
        await uploadPhoto(asset.uri);
      }
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!currentUid) return;

    setUploading(true);

    try {
      // Compress image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Pre-generate Firestore document reference to get ID
      const memoryRef = doc(collection(firestore, `circles/${circleId}/memories`));
      const photoId = memoryRef.id;

      // Upload to Firebase Storage
      const photoRef = storageRef(storage, `circles/${circleId}/memories/${photoId}.jpg`);

      const response = await fetch(manipResult.uri);
      const blob = await response.blob();

      await uploadBytes(photoRef, blob);
      const downloadUrl = await getDownloadURL(photoRef);

      // Get user data
      const userDoc = await firestore.collection('users').doc(currentUid).get();
      const userName = userDoc.data()?.displayName || 'Unknown';

      // Auto-link to plan if within 48 hours
      let linkedPlanId = null;
      let linkedPlanName = null;
      const now = Date.now();

      for (const plan of plans) {
        const planDate = plan.date?.toMillis ? plan.date.toMillis() : plan.date;
        const timeDiff = Math.abs(now - planDate);
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff <= 48) {
          linkedPlanId = plan.id;
          linkedPlanName = plan.title || plan.name;
          break;
        }
      }

      // Write metadata to Firestore
      await setDoc(memoryRef, {
        storageUrl: downloadUrl,
        thumbnailUrl: downloadUrl, // Could generate actual thumbnail
        uploaderUid: currentUid,
        uploaderName: userName,
        caption: null,
        reactions: {},
        planId: linkedPlanId,
        planName: linkedPlanName,
        uploadedAt: Date.now(),
      });

      console.log('Photo uploaded:', photoId);
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoPress = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleAddReaction = async (photoId: string, emoji: string) => {
    if (!currentUid) return;

    try {
      const photoRef = doc(firestore, `circles/${circleId}/memories/${photoId}`);
      const photo = photos.find((p) => p.id === photoId);

      if (!photo) return;

      const reactions = { ...photo.reactions };
      const emojiReactions = reactions[emoji] || [];

      if (emojiReactions.includes(currentUid)) {
        // Remove reaction
        reactions[emoji] = emojiReactions.filter((uid) => uid !== currentUid);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        // Add reaction
        reactions[emoji] = [...emojiReactions, currentUid];
      }

      await updateDoc(photoRef, { reactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleAddCaption = async (photoId: string, caption: string) => {
    try {
      const photoRef = doc(firestore, `circles/${circleId}/memories/${photoId}`);
      await updateDoc(photoRef, { caption });
    } catch (error) {
      console.error('Error adding caption:', error);
      Alert.alert('Error', 'Failed to add caption');
    }
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required');
        return;
      }

      // Download image
      const fileUri = `${FileSystem.documentDirectory}${photo.id}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(photo.storageUrl, fileUri);

      // Save to camera roll
      await MediaLibrary.createAssetAsync(downloadResult.uri);

      Alert.alert('Success', 'Photo saved to camera roll');
    } catch (error) {
      console.error('Error downloading photo:', error);
      Alert.alert('Error', 'Failed to download photo');
    }
  };

  const months = getMonths();

  return (
    <View style={styles.container}>
      {/* Month filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {months.map((month) => (
          <TouchableOpacity
            key={month}
            style={[
              styles.filterPill,
              selectedMonth === month && styles.filterPillActive,
            ]}
            onPress={() => setSelectedMonth(month)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedMonth === month && styles.filterPillTextActive,
              ]}
            >
              {month}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Plan filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedPlan === 'All Plans' && styles.filterPillActive,
          ]}
          onPress={() => setSelectedPlan('All Plans')}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedPlan === 'All Plans' && styles.filterPillTextActive,
            ]}
          >
            All Plans
          </Text>
        </TouchableOpacity>
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.filterPill,
              selectedPlan === plan.id && styles.filterPillActive,
            ]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedPlan === plan.id && styles.filterPillTextActive,
              ]}
            >
              {plan.title || plan.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Photo grid */}
      <FlatList
        data={filteredPhotos}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.thumbnail}
            onPress={() => handlePhotoPress(index)}
          >
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.thumbnailImage}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add memories
            </Text>
          </View>
        }
      />

      {/* Upload FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleUploadPress}
        disabled={uploading}
      >
        <Text style={styles.fabIcon}>{uploading ? '⏳' : '+'}</Text>
      </TouchableOpacity>

      {/* Photo viewer */}
      {viewerVisible && (
        <PhotoViewer
          photos={filteredPhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
          onAddReaction={handleAddReaction}
          onAddCaption={handleAddCaption}
          onDownload={handleDownload}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  filterRow: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  filterPillTextActive: {
    color: Colors.surface,
  },
  grid: {
    padding: GAP,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    margin: GAP / 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceAlt,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.md,
    color: Colors.textTertiary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.surface,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  navButtonText: {
    fontSize: 32,
    color: '#FFF',
  },
  viewerTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeButton: {
    fontSize: 32,
    color: '#FFF',
  },
  photoCounter: {
    fontSize: Typography.fontSize.md,
    color: '#FFF',
    fontWeight: Typography.fontWeight.semibold,
  },
  downloadButton: {
    fontSize: 24,
    color: '#FFF',
  },
  viewerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  photoInfo: {
    marginBottom: 12,
  },
  uploaderName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFF',
  },
  uploadDate: {
    fontSize: Typography.fontSize.sm,
    color: '#CCC',
    marginTop: 2,
  },
  planTag: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    marginTop: 4,
  },
  captionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  captionText: {
    fontSize: Typography.fontSize.md,
    color: '#FFF',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.md,
  },
  addCaptionButton: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  addCaptionText: {
    fontSize: Typography.fontSize.md,
    color: Colors.primary,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  reactionButtonActive: {
    backgroundColor: Colors.primary,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionCount: {
    fontSize: Typography.fontSize.sm,
    color: '#FFF',
    fontWeight: Typography.fontWeight.semibold,
  },
  captionInputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  captionInputBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  captionInputTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  captionInput: {
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  captionInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  captionCancelButton: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  captionSaveButton: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
