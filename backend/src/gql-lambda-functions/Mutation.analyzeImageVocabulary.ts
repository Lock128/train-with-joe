import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAIService } from '../services/ai-service';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type { VocabularyList } from '../model/domain/VocabularyList';

/**
 * Lambda resolver for Mutation.analyzeImageVocabulary
 * Reads images from S3 and analyzes them using Amazon Bedrock AI to extract vocabulary words.
 * Supports multiple images per request — each image produces its own VocabularyList,
 * but for now we merge all words into a single list.
 */

interface AnalyzeImageVocabularyInput {
  imageS3Keys: string[];
  language?: string;
}

interface Event {
  arguments: {
    input: AnalyzeImageVocabularyInput;
  };
  identity: {
    sub: string;
  };
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.ASSETS_BUCKET_NAME!;

async function getImageBase64(s3Key: string): Promise<string> {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes).toString('base64');
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { input } = event.arguments;

  if (!userId) {
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  if (!input?.imageS3Keys?.length) {
    return { success: false, vocabularyList: null, error: 'At least one image S3 key is required' };
  }

  // Validate that all keys belong to this user
  for (const key of input.imageS3Keys) {
    if (!key.startsWith(`uploads/${userId}/`)) {
      return { success: false, vocabularyList: null, error: 'Invalid image key' };
    }
  }

  try {
    const aiService = getAIService();
    const allWords: VocabularyList['words'] = [];
    let title = '';

    for (const s3Key of input.imageS3Keys) {
      const imageBase64 = await getImageBase64(s3Key);
      const result = await aiService.analyzeImageForVocabulary(imageBase64, userId, input.language);
      if (!title) title = result.title;
      allWords.push(...result.words);
    }

    const repository = VocabularyListRepository.getInstance();
    const vocabularyList: VocabularyList = {
      id: crypto.randomUUID(),
      userId,
      title: input.imageS3Keys.length > 1 ? `${title} (+${input.imageS3Keys.length - 1} more)` : title,
      words: allWords,
      sourceImageKey: input.imageS3Keys[0],
      language: input.language || 'English',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await repository.create(vocabularyList);

    return { success: true, vocabularyList: created, error: null };
  } catch (error) {
    console.error('Error analyzing image for vocabulary:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to analyze image for vocabulary',
    };
  }
};
