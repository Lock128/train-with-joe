import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAIService } from '../services/ai-service';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type { VocabularyList } from '../model/domain/VocabularyList';

/**
 * Async Lambda for processing image vocabulary analysis.
 * Invoked asynchronously by the analyzeImageVocabulary mutation Lambda.
 * Reads images from S3, calls Bedrock, and updates the DynamoDB record.
 */

interface ProcessEvent {
  vocabularyListId: string;
  userId: string;
  imageS3Keys: string[];
  sourceLanguage?: string;
  targetLanguage?: string;
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.ASSETS_BUCKET_NAME!;

async function getImageBase64(s3Key: string): Promise<string> {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes).toString('base64');
}

export const handler = async (event: ProcessEvent) => {
  const { vocabularyListId, userId, imageS3Keys, sourceLanguage, targetLanguage } = event;
  const repository = VocabularyListRepository.getInstance();

  console.log(
    '[process-image-vocabulary] Invoked',
    JSON.stringify({
      vocabularyListId,
      userId,
      imageCount: imageS3Keys.length,
      sourceLanguage,
      targetLanguage,
    }),
  );

  try {
    const aiService = getAIService();
    const allWords: VocabularyList['words'] = [];
    let title = '';
    let detectedSourceLang = sourceLanguage || '';
    let detectedTargetLang = targetLanguage || '';
    const failedImages: { index: number; s3Key: string; error: string }[] = [];

    for (let i = 0; i < imageS3Keys.length; i++) {
      const s3Key = imageS3Keys[i];
      console.log(`[process-image-vocabulary] Processing image ${i + 1}/${imageS3Keys.length}: ${s3Key}`);

      try {
        const imageBase64 = await getImageBase64(s3Key);
        console.log(`[process-image-vocabulary] Image loaded from S3, base64 size: ${imageBase64.length} chars`);

        const result = await aiService.analyzeImageForVocabulary(imageBase64, userId, sourceLanguage, targetLanguage, {
          skipRateLimit: true,
        });

        console.log(
          `[process-image-vocabulary] Image ${i + 1} analysis complete`,
          JSON.stringify({
            title: result.title,
            wordCount: result.words.length,
            sourceLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
          }),
        );

        if (!title) title = result.title;
        if (!detectedSourceLang) detectedSourceLang = result.sourceLanguage;
        if (!detectedTargetLang) detectedTargetLang = result.targetLanguage;
        allWords.push(...result.words);
      } catch (imageError) {
        const errorMsg = imageError instanceof Error ? imageError.message : 'Unknown error';
        console.warn(
          `[process-image-vocabulary] Image ${i + 1}/${imageS3Keys.length} failed, continuing with remaining images: ${errorMsg}`,
        );
        failedImages.push({ index: i + 1, s3Key, error: errorMsg });
      }
    }

    // Determine final status based on results
    const totalImages = imageS3Keys.length;
    const failedCount = failedImages.length;
    const succeededCount = totalImages - failedCount;

    if (succeededCount === 0) {
      // Every image failed — mark as FAILED
      const errorMessage = `All ${totalImages} images failed to process. First error: ${failedImages[0]?.error}`;
      console.error(`[process-image-vocabulary] ${errorMessage}`);

      await repository.update(vocabularyListId, {
        status: 'FAILED',
        errorMessage,
      });

      console.error(`[process-image-vocabulary] Marked as FAILED`, JSON.stringify({ vocabularyListId, errorMessage }));
      return;
    }

    const finalTitle = totalImages > 1 ? `${title} (+${totalImages - 1} more)` : title;
    const isPartial = failedCount > 0;
    const status = isPartial ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
    const errorMessage = isPartial ? `${failedCount}/${totalImages} images failed to process` : undefined;

    await repository.update(vocabularyListId, {
      title: finalTitle,
      words: allWords,
      sourceLanguage: detectedSourceLang || undefined,
      targetLanguage: detectedTargetLang || undefined,
      status,
      errorMessage,
    });

    console.log(
      `[process-image-vocabulary] ${status}`,
      JSON.stringify({
        vocabularyListId,
        totalWords: allWords.length,
        title: finalTitle,
        succeededImages: succeededCount,
        failedImages: failedCount,
      }),
    );
  } catch (error) {
    console.error(`[process-image-vocabulary] Failed for ${vocabularyListId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image for vocabulary';

    await repository.update(vocabularyListId, {
      status: 'FAILED',
      errorMessage,
    });

    console.error(
      `[process-image-vocabulary] Marked as FAILED`,
      JSON.stringify({
        vocabularyListId,
        errorMessage,
      }),
    );
  }
};
