import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import sharp from 'sharp';

const gcs = new Storage();
const firestore = admin.firestore();

/**
 * Cloud Function triggered on Firebase Storage upload.
 * Generates a 400px thumbnail for images uploaded to `circles/{circleId}/memories/{photoId}.jpg`.
 */
export const onMemoryPhotoUploaded = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;

  if (!filePath) return;

  // Ensure it's an image
  if (!contentType?.startsWith('image/')) {
    console.log('Not an image.');
    return;
  }

  // Ensure it's in the memories folder: circles/{circleId}/memories/{photoId}.jpg
  const pathSegments = filePath.split('/');
  if (pathSegments.length !== 4 || pathSegments[0] !== 'circles' || pathSegments[2] !== 'memories') {
    console.log('Not a memory photo.');
    return;
  }

  const fileName = path.basename(filePath);

  // Prevent infinite loop by checking if it's already a thumbnail
  if (fileName.includes('_thumb')) {
    console.log('Already a thumbnail.');
    return;
  }

  const circleId = pathSegments[1];
  // fileName is like "id12345.jpg"
  const photoId = path.parse(fileName).name; 

  const bucket = gcs.bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const thumbFileName = `${photoId}_thumb.jpg`;
  const thumbFilePath = path.join(path.dirname(filePath), 'thumbnails', thumbFileName);
  const tempThumbPath = path.join(os.tmpdir(), thumbFileName);

  try {
    // 1. Download original file
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('Image downloaded locally to', tempFilePath);

    // 2. Generate thumbnail using sharp
    await sharp(tempFilePath)
      .resize(400) // 400px wide, auto height
      .jpeg({ quality: 80 })
      .toFile(tempThumbPath);
    console.log('Thumbnail created at', tempThumbPath);

    // 3. Upload thumbnail
    await bucket.upload(tempThumbPath, {
      destination: thumbFilePath,
      metadata: {
        contentType: 'image/jpeg',
      },
    });
    console.log('Thumbnail uploaded to Storage at', thumbFilePath);

    // 4. Get the public download URL (Assuming standard Firebase Storage URL format)
    const encodedPath = encodeURIComponent(thumbFilePath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodedPath}?alt=media`;

    // 5. Update Firestore document
    const memoryRef = firestore.doc(`circles/${circleId}/memories/${photoId}`);
    await memoryRef.update({
      thumbnailUrl: downloadUrl,
    });
    console.log('Firestore document updated with thumbnail URL');

  } catch (error) {
    console.error('Error processing thumbnail:', error);
  } finally {
    // 6. Clean up temporary files
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
  }
});
