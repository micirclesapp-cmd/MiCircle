/**
 * Avatar Upload Utilities
 * 
 * Handles Firebase Storage uploads for user avatars with progress tracking,
 * error handling, retry logic, and fallback to presets.
 */

import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface UploadProgress {
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Upload avatar image to Firebase Storage
 * 
 * Path: avatars/{uid}.jpg
 * Max size: 2MB
 * Automatically retries on failure (3 attempts)
 * 
 * @param uid - User ID
 * @param imageData - Image data (Blob or Uint8Array)
 * @param onProgress - Callback to track upload progress (0-100)
 * @returns { success, avatarUrl?, error? }
 */
export async function uploadAvatarToFirebase(
  uid: string,
  imageData: Blob | Uint8Array,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const MAX_RETRIES = 3;

  // Validate file size
  if (imageData instanceof Blob && imageData.size > MAX_FILE_SIZE) {
    const error = `File too large. Max 2MB, got ${(imageData.size / 1024 / 1024).toFixed(1)}MB`;
    onProgress?.({
      progress: 0,
      status: 'error',
      error,
    });
    return { success: false, error };
  }

  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      onProgress?.({
        progress: 0,
        status: 'uploading',
      });

      const storageRef = ref(storage, `avatars/${uid}.jpg`);

      // Upload with simulated progress
      // Note: Firebase Storage doesn't provide real-time progress for uploadBytes
      // In a production app, use uploadBytesResumable for true progress tracking
      onProgress?.({
        progress: 25,
        status: 'uploading',
      });

      await uploadBytes(storageRef, imageData);

      onProgress?.({
        progress: 75,
        status: 'uploading',
      });

      const downloadUrl = await getDownloadURL(storageRef);

      onProgress?.({
        progress: 100,
        status: 'success',
      });

      return {
        success: true,
        avatarUrl: downloadUrl,
      };
    } catch (error) {
      console.error(`Avatar upload attempt ${attempt}/${MAX_RETRIES} failed:`, error);

      if (attempt === MAX_RETRIES) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onProgress?.({
          progress: 0,
          status: 'error',
          error: errorMessage,
        });

        return {
          success: false,
          error: `Upload failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
        };
      }

      // Wait before retrying (exponential backoff: 1s, 2s, 4s)
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    success: false,
    error: 'Upload failed',
  };
}

/**
 * Validate image dimensions
 * Ensures image is at least 64x64 and at most 2048x2048
 */
export async function validateImageDimensions(
  imageUri: string
): Promise<{ valid: boolean; width?: number; height?: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;

      if (width < 64 || height < 64) {
        resolve({
          valid: false,
          width,
          height,
          error: `Image too small. Min 64x64, got ${width}x${height}`,
        });
        return;
      }

      if (width > 2048 || height > 2048) {
        resolve({
          valid: false,
          width,
          height,
          error: `Image too large. Max 2048x2048, got ${width}x${height}`,
        });
        return;
      }

      resolve({ valid: true, width, height });
    };
    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Failed to load image',
      });
    };
    img.src = imageUri;
  });
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

/**
 * Handle avatar upload error gracefully
 * Returns user-friendly error message
 */
export function formatUploadError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('permission')) {
      return 'Permission denied. Check storage permissions.';
    }

    if (message.includes('network')) {
      return 'Network error. Check your connection and try again.';
    }

    if (message.includes('timeout')) {
      return 'Upload timed out. Please try again.';
    }

    return error.message;
  }

  return 'Upload failed. Please try again.';
}

/**
 * Estimate upload time based on file size
 * Assumes ~1Mbps average upload speed
 * @param fileSizeBytes - File size in bytes
 * @returns Estimated time in seconds
 */
export function estimateUploadTime(fileSizeBytes: number): number {
  const speedMbps = 1;
  const sizeMb = fileSizeBytes / 1024 / 1024;
  const timeSeconds = (sizeMb / speedMbps) * 8;
  return Math.max(1, Math.ceil(timeSeconds));
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g. "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create blob from URI (for React Native)
 * Works with file:// URIs from image picker
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri);
    return await response.blob();
  } catch (error) {
    throw new Error(`Failed to convert URI to Blob: ${error}`);
  }
}

/**
 * Compress image before upload
 * Reduces file size while maintaining quality
 * 
 * Note: Implementation depends on available libraries
 * This is a placeholder for integration with image-resizer or similar
 */
export async function compressImage(
  imageUri: string,
  maxWidth: number = 512,
  maxHeight: number = 512,
  quality: number = 0.8
): Promise<string> {
  // This would typically use a library like:
  // - expo-image-manipulator
  // - @react-native-camera-roll/camera-roll
  // For now, return original URI
  // TODO: Implement actual compression after integrating a library
  return imageUri;
}
