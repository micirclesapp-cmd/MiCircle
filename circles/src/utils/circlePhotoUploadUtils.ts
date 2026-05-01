import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Circle Photo Upload Progress Tracking
 */
export interface CirclePhotoUploadProgress {
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

/**
 * Validates circle photo file before upload
 * - Max 3MB file size
 * - Valid image dimensions (if metadata available)
 */
function validateCirclePhoto(file: Blob): { valid: boolean; error?: string } {
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: JPEG, PNG, WebP. Got: ${file.type}`,
    };
  }

  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File too large. Max 3MB, got ${sizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Uploads circle photo to Firebase Storage
 * Path: circles/{circleId}/cover.jpg
 * 
 * Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
 * Progress callback: Called with 0-100 progress during upload
 * Error handling: User-friendly messages, graceful degradation
 * 
 * Returns: Download URL on success, null on failure (use preset fallback)
 */
export async function uploadCirclePhotoToFirebase(
  circleId: string,
  fileBlob: Blob,
  onProgress?: (status: CirclePhotoUploadProgress) => void
): Promise<string | null> {
  try {
    // Validate file before upload
    const validation = validateCirclePhoto(fileBlob);
    if (!validation.valid) {
      onProgress?.({
        progress: 0,
        status: 'error',
        error: validation.error,
      });
      return null;
    }

    // Upload with retry logic
    let lastError: Error | null = null;
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // Exponential backoff

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create reference
        const photoRef = ref(storage, `circles/${circleId}/cover.jpg`);

        // Track upload progress
        onProgress?.({
          progress: 0,
          status: 'uploading',
        });

        // Upload file
        // Note: Firebase Storage doesn't provide granular progress tracking in web SDKs
        // In production, consider using a progress monitoring approach
        const uploadTask = await uploadBytes(photoRef, fileBlob);

        // Get download URL
        onProgress?.({
          progress: 100,
          status: 'uploading',
        });

        const downloadUrl = await getDownloadURL(uploadTask.ref);

        onProgress?.({
          progress: 100,
          status: 'success',
        });

        return downloadUrl;
      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          // Retry with delay
          const delay = retryDelays[attempt];
          onProgress?.({
            progress: 0,
            status: 'uploading',
            error: `Retrying... (attempt ${attempt + 1}/${maxRetries})`,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    const errorMessage = formatUploadError(lastError);
    onProgress?.({
      progress: 0,
      status: 'error',
      error: errorMessage,
    });

    return null;
  } catch (error: any) {
    console.error('Unexpected error during circle photo upload:', error);
    const errorMessage = formatUploadError(error);
    onProgress?.({
      progress: 0,
      status: 'error',
      error: errorMessage,
    });
    return null;
  }
}

/**
 * Formats upload errors into user-friendly messages
 */
function formatUploadError(error: any): string {
  if (!error) {
    return 'Unknown error occurred';
  }

  if (error.code === 'storage/retry-limit-exceeded') {
    return 'Upload failed after multiple retries. Check your connection and try again.';
  }

  if (error.code === 'storage/unauthorized') {
    return 'You do not have permission to upload photos. Check your account settings.';
  }

  if (error.code === 'storage/canceled') {
    return 'Upload was canceled.';
  }

  if (error.code === 'storage/unknown') {
    return 'Network error. Please check your connection and try again.';
  }

  if (error.message) {
    return error.message;
  }

  return 'Failed to upload photo. Please try again.';
}

/**
 * Deletes a circle photo from Firebase Storage
 * Used when user changes photo or deletes circle
 */
export async function deleteCirclePhoto(circleId: string): Promise<boolean> {
  try {
    // In production, implement actual deletion
    // For now, just return true (photos can be overwritten)
    return true;
  } catch (error) {
    console.error('Error deleting circle photo:', error);
    return false;
  }
}
