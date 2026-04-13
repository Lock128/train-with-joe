import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Lambda resolver for Query.getImageDownloadUrl
 * Generates presigned S3 GET URLs for downloading/viewing images.
 * Only allows access to images under the authenticated user's uploads folder.
 */

interface Event {
  arguments: {
    input: {
      s3Keys: string[];
    };
  };
  identity: {
    sub: string;
  };
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.ASSETS_BUCKET_NAME!;
const URL_EXPIRY_SECONDS = 3600; // 1 hour

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { s3Keys } = event.arguments.input;

  if (!userId) {
    return { success: false, downloadUrls: null, error: 'Authentication required' };
  }

  if (!s3Keys?.length) {
    return { success: false, downloadUrls: null, error: 's3Keys is required' };
  }

  if (s3Keys.length > 50) {
    return { success: false, downloadUrls: null, error: 'Maximum 50 keys allowed' };
  }

  // Security: only allow access to the user's own uploads
  for (const key of s3Keys) {
    if (!key.startsWith(`uploads/${userId}/`)) {
      return { success: false, downloadUrls: null, error: 'Access denied' };
    }
  }

  try {
    const downloadUrls = await Promise.all(
      s3Keys.map(async (s3Key) => {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
        const downloadUrl = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });
        return { s3Key, downloadUrl };
      }),
    );
    return { success: true, downloadUrls, error: null };
  } catch (error) {
    console.error('Error generating presigned download URLs:', error);
    return { success: false, downloadUrls: null, error: 'Failed to generate download URLs' };
  }
};
