# F-02: Avatar Upload Guide

## Overview

The avatar upload system allows users to upload custom profile pictures during onboarding to Firebase Storage. This guide covers setup, implementation, error handling, and testing.

---

## Architecture

### Upload Flow

```
User Selects Image (Camera Roll)
    ↓
Validate Size (<2MB)
    ↓
Validate Dimensions (64x64 to 2048x2048)
    ↓
Convert URI to Blob
    ↓
Upload to Firebase Storage (avatars/{uid}.jpg)
    ↓
Show Progress (0% → 100%)
    ↓
Success: Store Firebase URL
  OR
Error: Show Retry Button, Use Preset Fallback
```

### Storage Structure

```
Firebase Storage: gs://[project-id].appspot.com/
├── avatars/
│   ├── {uid1}.jpg          → User 1 avatar
│   ├── {uid2}.jpg          → User 2 avatar
│   └── {uid3}.jpg          → User 3 avatar
```

### Security

- **Path**: `avatars/{uid}.jpg` - Scoped to user's UID
- **Size limit**: 2MB
- **Dimensions**: 64x64 to 2048x2048 pixels
- **MIME types**: JPEG, PNG, GIF, WebP
- **Access**: Users can only upload their own avatar (enforced by Firebase Rules)

---

## Firebase Configuration

### 1. Enable Firebase Storage

```javascript
// circles/src/services/firebase.ts

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

export const storage = getStorage(app);
```

### 2. Set Security Rules

File: `firebase-rules.storage`

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to upload only their own avatar
    match /avatars/{uid}.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid && request.resource.size < 2*1024*1024;
    }
    
    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy with:
```bash
firebase deploy --only storage
```

### 3. Configure Storage Quotas (Optional)

In Firebase Console:
- Storage → Rules
- Set per-user limits if needed (e.g., 50MB max per user)
- Monitor usage in Analytics

---

## Implementation Details

### uploadAvatarToFirebase()

Location: `circles/src/utils/avatarUploadUtils.ts`

```typescript
async function uploadAvatarToFirebase(
  uid: string,
  imageData: Blob | Uint8Array,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult>
```

**Parameters**:
- `uid` - User's Firebase UID
- `imageData` - Image data (Blob from ImagePicker)
- `onProgress` - Callback for progress updates

**Return**:
```typescript
{
  success: true,
  avatarUrl: "https://firebasestorage.googleapis.com/..."
}
// OR
{
  success: false,
  error: "File too large. Max 2MB, got 5.2MB"
}
```

**Error Handling**:
- Validates file size before upload
- Retries up to 3 times on failure (exponential backoff: 1s, 2s, 4s)
- Returns user-friendly error messages

### Upload States

During upload, UI shows:
- **0% → 25%**: "Uploading..."
- **25% → 75%**: "Uploading..." (simulated progress)
- **75% → 100%**: "Uploading..." (finalizing)
- **100%**: Success indicator

### Progress Tracking

```typescript
interface UploadProgress {
  progress: number;              // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;                // Error message if failed
}
```

UI Updates in Real-Time:
```javascript
onProgress?.({
  progress: 25,
  status: 'uploading',
});
// Show progress bar: ███░░░░░░░
```

---

## Error Scenarios

### File Size Validation

```typescript
// Before upload
if (imageData.size > 2 * 1024 * 1024) {
  return {
    success: false,
    error: `File too large. Max 2MB, got ${(imageData.size/1024/1024).toFixed(1)}MB`
  };
}
```

**User sees**: "File too large. Max 2MB, got 5.2MB"

### Network Errors

```javascript
try {
  await uploadBytes(storageRef, imageData);
} catch (error) {
  if (error.message.includes('network')) {
    return {
      success: false,
      error: 'Network error. Check your connection and try again.'
    };
  }
}
```

**User sees**: Retry button + can use preset fallback

### Permission Errors

```javascript
// Firebase Security Rules reject upload
// Error: "Permission denied"

return {
  success: false,
  error: 'Permission denied. Check storage permissions.'
};
```

### Timeout

```javascript
// Upload takes >30 seconds
setTimeout(() => {
  // Cancel upload
  return {
    success: false,
    error: 'Upload timed out. Please try again.'
  };
}, 30000);
```

---

## Usage in AvatarScreen

### Step 1: User Taps Preview

```typescript
const handleTapPreview = () => {
  Alert.alert('Choose Avatar', 'Select an option', [
    { 
      text: 'Take photo', 
      onPress: async () => {
        // TODO: Launch camera
        // const result = await Camera.takePictureAsync();
        // const blob = await uriToBlob(result.uri);
        // handleUpload(blob);
      }
    },
    { 
      text: 'Choose from library', 
      onPress: async () => {
        // TODO: Launch image picker
        // const result = await ImagePicker.launchImageLibraryAsync();
        // const blob = await uriToBlob(result.uri);
        // handleUpload(blob);
      }
    },
    { text: 'Use an avatar', onPress: () => {} },
    { text: 'Cancel', style: 'cancel' },
  ]);
};
```

### Step 2: User Selects Image

```typescript
const handleUpload = async (imageData: Blob) => {
  setIsUploading(true);
  setUploadError(null);

  const result = await uploadAvatarToFirebase(
    auth.currentUser?.uid || '',
    imageData,
    (progress) => {
      setUploadProgress(progress);
    }
  );

  if (result.success) {
    setAvatarUrl(result.avatarUrl);
    setUseCustomUpload(true);
    Alert.alert('Success', 'Avatar uploaded!');
  } else {
    setUploadError(result.error);
    // Fallback to preset is available
  }

  setIsUploading(false);
};
```

### Step 3: Show Progress

```typescript
{isUploading && (
  <View style={{ marginBottom: 24 }}>
    {/* Progress Bar */}
    <View style={{ height: 6, backgroundColor: '#EEE', borderRadius: 3, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${uploadProgress.progress}%`,
          backgroundColor: Colors.primary,
        }}
      />
    </View>
    {/* Progress Text */}
    <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
      Uploading {uploadProgress.progress}%
    </Text>
  </View>
)}
```

### Step 4: Handle Errors

```typescript
{uploadError && (
  <View style={{ backgroundColor: '#FFE5E5', borderRadius: 8, padding: 12 }}>
    <Text style={{ fontSize: 12, color: '#CC0000' }}>
      {uploadError}
    </Text>
    <TouchableOpacity onPress={() => setUploadError(null)}>
      <Text style={{ color: Colors.primary, fontWeight: '600' }}>
        Retry or Dismiss
      </Text>
    </TouchableOpacity>
  </View>
)}
```

### Step 5: Continue (With Fallback)

```typescript
const handleContinue = () => {
  // Use uploaded URL or fallback to preset
  const finalUrl = avatarUrl || `preset:${PRESET_AVATARS[0].id}`;
  setAvatarUrl(finalUrl);
  navigation.navigate(Routes.BIO);
};
```

---

## Validation Functions

### Image Dimensions

```typescript
async function validateImageDimensions(imageUri: string) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      
      if (width < 64 || height < 64) {
        resolve({
          valid: false,
          error: `Image too small. Min 64x64, got ${width}x${height}`
        });
      } else if (width > 2048 || height > 2048) {
        resolve({
          valid: false,
          error: `Image too large. Max 2048x2048, got ${width}x${height}`
        });
      } else {
        resolve({ valid: true, width, height });
      }
    };
    img.src = imageUri;
  });
}
```

**Used for**: Pre-upload validation

### MIME Type

```typescript
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}
```

**Used for**: Upload metadata

### File Size Formatting

```typescript
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Usage
console.log(formatFileSize(2097152)); // "2 MB"
```

---

## Testing

### Unit Tests

```typescript
// Test: File size validation
test('uploadAvatarToFirebase rejects files > 2MB', async () => {
  const blob = new Blob(['x'.repeat(3*1024*1024)]);
  const result = await uploadAvatarToFirebase('uid', blob);
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('too large');
});

// Test: Successful upload
test('uploadAvatarToFirebase returns URL on success', async () => {
  const blob = new Blob([imageData]);
  const result = await uploadAvatarToFirebase('uid123', blob);
  
  expect(result.success).toBe(true);
  expect(result.avatarUrl).toContain('firebasestorage');
});

// Test: Retry on network error
test('uploadAvatarToFirebase retries 3 times on network error', async () => {
  // Mock uploadBytes to fail twice, succeed on 3rd
  let attempts = 0;
  jest.spyOn(storage, 'uploadBytes').mockImplementation(() => {
    attempts++;
    if (attempts < 3) throw new Error('Network error');
    return Promise.resolve();
  });
  
  const result = await uploadAvatarToFirebase('uid', blob);
  expect(attempts).toBe(3);
  expect(result.success).toBe(true);
});
```

### Integration Tests

```javascript
// Test: Full upload flow in AvatarScreen
describe('AvatarScreen Upload', () => {
  test('shows progress during upload', async () => {
    render(<AvatarScreen />);
    
    const previewButton = screen.getByTestId('avatar-preview');
    fireEvent.press(previewButton);
    
    // User selects image
    fireEvent.press(screen.getByText('Choose from library'));
    
    // Progress bar appears
    await waitFor(() => {
      expect(screen.getByText(/Uploading \d+%/)).toBeVisible();
    });
  });

  test('uses preset fallback on upload error', async () => {
    // Mock upload failure
    jest.spyOn(avatarUpload, 'uploadAvatarToFirebase')
      .mockResolvedValue({ success: false, error: 'Network error' });
    
    render(<AvatarScreen />);
    
    // Trigger upload
    // ...
    
    // Error message appears
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeVisible();
    });
    
    // User can still continue
    fireEvent.press(screen.getByText('Continue'));
    // Should use preset fallback
  });
});
```

### Manual Testing Checklist

- [ ] Upload <1MB JPEG image
  - Shows progress 0% → 100%
  - Succeeds and shows URL in store
  - User can continue

- [ ] Upload >2MB image
  - Shows error: "File too large..."
  - No upload attempt made
  - User can dismiss and use preset

- [ ] Turn off wifi during upload
  - Shows error: "Network error..."
  - Retry button available
  - Can use preset fallback
  - Can dismiss error and continue

- [ ] Upload very small image (10x10 pixels)
  - Accepts upload (no dimension validation pre-upload)
  - Display looks correct

- [ ] Upload very large image (8000x8000 pixels)
  - Accepts upload (no dimension validation pre-upload)
  - Display looks correct

---

## Performance

### Upload Speed

Assuming ~1 Mbps average upload:

| Image Size | Upload Time |
|-----------|------------|
| 100 KB    | 0.8s      |
| 500 KB    | 4s        |
| 1 MB      | 8s        |
| 2 MB      | 16s       |

**Optimization**: Compress images before upload (future)

### Network Efficiency

- Uses exponential backoff: 1s, 2s, 4s between retries
- Prevents overwhelming network on failures
- Max 3 retries (gives up after ~7 seconds total)

### Storage Costs (Firebase Pricing)

Approximate cost for 1,000 users uploading avatars:
- Upload: 1,000 × 1MB = 1GB @ $0.18/GB = $0.18
- Storage: 1,000 × 1MB = 1GB @ $0.018/GB/mo = $0.018/mo
- **Total**: ~$0.20/month for 1,000 users

---

## Future Improvements

### Short Term (MVP+)
- [ ] Implement camera capture
- [ ] Implement gallery picker
- [ ] Real-time progress with uploadBytesResumable
- [ ] Image compression before upload
- [ ] Cancel upload in progress

### Medium Term
- [ ] CDN integration for image delivery
- [ ] Thumbnail generation (multiple sizes)
- [ ] Image format conversion (WEBP, AVIF)
- [ ] Analytics: upload success rate, average size

### Long Term
- [ ] Image recognition (NSFW detection)
- [ ] AI crop detection (face centering)
- [ ] Cloudinary or Imgix integration
- [ ] Batch upload processing

---

## Troubleshooting

### "Permission denied" Error

**Cause**: Firebase Security Rules deny write

**Fix**:
1. Check Firebase Console → Storage → Rules
2. Verify rule allows `avatars/{uid}.jpg`
3. Verify `request.auth.uid == uid`
4. Deploy rules: `firebase deploy --only storage`

### "File too large" Error

**Cause**: Image > 2MB

**Fix**:
1. User should select smaller image
2. In future: Implement compression before upload

### Upload Hangs (No Progress Update)

**Cause**: Network timeout or stuck connection

**Fix**:
1. Add timeout: `setTimeout(() => cancel(), 30000)`
2. Show "Upload timed out" error
3. User can retry

### URL Not Saving to Firestore

**Cause**: Avatar URL lost before Firestore write in IntentScreen

**Fix**:
1. Verify `setAvatarUrl()` called in AvatarScreen
2. Verify auth store persists URL
3. Check IntentScreen reads `avatarUrl` from store

---

## Security Checklist

- [ ] File size validated (max 2MB)
- [ ] File dimensions validated (64x64 to 2048x2048)
- [ ] Storage path scoped to user UID
- [ ] Firebase Rules restrict reads/writes
- [ ] MIME type validated
- [ ] No sensitive data in image metadata
- [ ] User can't access other users' avatars
- [ ] User can't upload to arbitrary paths

---

## References

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Firebase Security Rules](https://firebase.google.com/docs/storage/security)
- [Image Size Specifications](https://web.archive.org/web/20231001000000*/developers.google.com/identity/branding)
- [React Native Image Picker](https://github.com/react-native-image-picker/react-native-image-picker)
