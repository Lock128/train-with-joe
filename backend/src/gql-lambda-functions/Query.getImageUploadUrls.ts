import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Lambda resolver for Query.getImageUploadUrls
 * Generates presigned S3 PUT URLs for image uploads.
 * Images are stored under uploads/<userId>/<uuid>.<ext>
 */

interface Event {
  arguments: {
    input: {
      count: number;
    };
  };
  identity: {
    sub: string;
  };
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.ASSETS_BUCKET_NAME!;
const URL_EXPIRY_SECONDS = 300; // 5 minutes

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { count } = event.arguments.input;

  if (!userId) {
    return { success: false, uploads: null, error: 'Authentication required' };
  }

  if (!count || count < 1 || count > 20) {
    return { success: false, uploads: null, error: 'count must be between 1 and 20' };
  }

  try {
    const uploads = await Promise.all(
      Array.from({ length: count }, async () => {
        const s3Key = `uploads/${userId}/${crypto.randomUUID()}.jpg`;
        const command = new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          ContentType: 'image/jpeg',
        });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });
        return { s3Key, uploadUrl };
      }),
    );

    return { success: true, uploads, error: null };
  } catch (error) {
    console.error('Error generating presigned URLs:', error);
    return {
      success: false,
      uploads: null,
      error: error instanceof Error ? error.message : 'Failed to generate upload URLs',
    };
  }
};
