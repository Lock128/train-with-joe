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

  try {
    const aiService = getAIService();
    const allWords: VocabularyList['words'] = [];
    let title = '';
    let detectedSourceLang = sourceLanguage || '';
    let detectedTargetLang = targetLanguage || '';

    for (const s3Key of imageS3Keys) {
      const imageBase64 = await getImageBase64(s3Key);
      const result = await aiService.analyzeImageForVocabulary(imageBase64, userId, sourceLanguage, targetLanguage);
      if (!title) title = result.title;
      if (!detectedSourceLang) detectedSourceLang = result.sourceLanguage;
      if (!detectedTargetLang) detectedTargetLang = result.targetLanguage;
      allWords.push(...result.words);
    }

    const finalTitle = imageS3Keys.length > 1 ? `${title} (+${imageS3Keys.length - 1} more)` : title;

    await repository.update(vocabularyListId, {
      title: finalTitle,
      words: allWords,
      sourceLanguage: detectedSourceLang || undefined,
      targetLanguage: detectedTargetLang || undefined,
      status: 'COMPLETED',
    });

    console.log(`Successfully processed vocabulary list ${vocabularyListId}`);
  } catch (error) {
    console.error(`Error processing vocabulary list ${vocabularyListId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image for vocabulary';

    await repository.update(vocabularyListId, {
      status: 'FAILED',
      errorMessage,
    });
  }
};
