import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAIService } from '../services/ai-service';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type { VocabularyList } from '../model/domain/VocabularyList';

/**
 * Async Lambda for processing image vocabulary analysis.
 * Invoked asynchronously by the analyzeImageVocabulary mutation Lambda.
 * Reads images from S3, calls Bedrock, and updates the DynamoDB record.
 *
 * Images are processed in parallel with a concurrency limit to balance
 * speed against Bedrock throttling limits.
 */

const CONCURRENCY = parseInt(process.env.IMAGE_PROCESSING_CONCURRENCY || '5', 10);

interface ProcessEvent {
  vocabularyListId: string;
  userId: string;
  imageS3Keys: string[];
  sourceLanguage?: string;
  targetLanguage?: string;
  phase?: 'recognize' | 'translate';
}

interface ImageResult {
  index: number;
  title: string;
  words: VocabularyList['words'];
  sourceLanguage: string;
  targetLanguage: string;
}

interface ImageFailure {
  index: number;
  s3Key: string;
  error: string;
}

interface RecognitionSuccess {
  index: number;
  title: string;
  detectedLanguage: string;
  words: string[];
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.ASSETS_BUCKET_NAME!;

async function getImageBase64(s3Key: string): Promise<string> {
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes).toString('base64');
}

/**
 * Process items with a concurrency limit.
 * Runs up to `limit` tasks in parallel, starting the next one as soon as a slot frees up.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export const handler = async (event: ProcessEvent) => {
  const { phase } = event;

  if (phase === 'recognize') {
    return handleRecognize(event);
  }

  if (phase === 'translate') {
    return handleTranslate(event);
  }

  // phase === undefined → legacy behavior (backward compatible)
  return handleLegacy(event);
};

/**
 * Phase 1: OCR text extraction from images.
 * Calls extractTextFromImage for each image, deduplicates words across all images,
 * and updates the vocabulary list to RECOGNIZED status.
 */
async function handleRecognize(event: ProcessEvent) {
  const { vocabularyListId, userId, imageS3Keys } = event;
  const repository = VocabularyListRepository.getInstance();

  console.log(
    '[process-image-vocabulary] Phase 1 (recognize) invoked',
    JSON.stringify({ vocabularyListId, userId, imageCount: imageS3Keys.length, concurrency: CONCURRENCY }),
  );

  try {
    const aiService = getAIService();
    const successes: RecognitionSuccess[] = [];
    const failures: ImageFailure[] = [];

    await mapWithConcurrency(imageS3Keys, CONCURRENCY, async (s3Key, i) => {
      console.log(`[process-image-vocabulary] [recognize] Processing image ${i + 1}/${imageS3Keys.length}: ${s3Key}`);

      try {
        const imageBase64 = await getImageBase64(s3Key);
        console.log(
          `[process-image-vocabulary] [recognize] Image loaded from S3, base64 size: ${imageBase64.length} chars`,
        );

        const result = await aiService.extractTextFromImage(imageBase64, userId, { skipRateLimit: true });

        console.log(
          `[process-image-vocabulary] [recognize] Image ${i + 1} extraction complete`,
          JSON.stringify({
            title: result.title,
            wordCount: result.words.length,
            detectedLanguage: result.detectedLanguage,
          }),
        );

        successes.push({
          index: i,
          title: result.title,
          detectedLanguage: result.detectedLanguage,
          words: result.words,
        });
      } catch (imageError) {
        const errorMsg = imageError instanceof Error ? imageError.message : 'Unknown error';
        console.warn(
          `[process-image-vocabulary] [recognize] Image ${i + 1}/${imageS3Keys.length} failed, continuing: ${errorMsg}`,
        );
        failures.push({ index: i + 1, s3Key, error: errorMsg });
      }
    });

    // Sort successes by original index so word order matches image order
    successes.sort((a, b) => a.index - b.index);

    const totalImages = imageS3Keys.length;
    const failedCount = failures.length;
    const succeededCount = successes.length;

    if (succeededCount === 0) {
      const errorMessage = `All ${totalImages} images failed to process. First error: ${failures[0]?.error}`;
      console.error(`[process-image-vocabulary] [recognize] ${errorMessage}`);

      await repository.update(vocabularyListId, {
        status: 'FAILED',
        errorMessage,
      });

      console.error(
        `[process-image-vocabulary] [recognize] Marked as FAILED`,
        JSON.stringify({ vocabularyListId, errorMessage }),
      );
      return;
    }

    // Collect all words from all successful images and deduplicate
    const allWords = successes.flatMap((s) => s.words);
    const uniqueWords = Array.from(new Set(allWords));

    // Map to VocabularyWord[] with only word populated and placeholder definition
    const vocabularyWords: VocabularyList['words'] = uniqueWords.map((word) => ({
      word,
      definition: 'Pending translation',
    }));

    // Use the first successful image for title and language detection
    const first = successes[0];
    const finalTitle = totalImages > 1 ? `${first.title} (+${totalImages - 1} more)` : first.title;
    const detectedSourceLang = first.detectedLanguage;

    const isPartial = failedCount > 0;
    const errorMessage = isPartial ? `${failedCount}/${totalImages} images failed to process` : undefined;

    await repository.update(vocabularyListId, {
      title: finalTitle,
      words: vocabularyWords,
      sourceLanguage: detectedSourceLang || undefined,
      status: 'RECOGNIZED',
      errorMessage,
    });

    console.log(
      `[process-image-vocabulary] [recognize] RECOGNIZED`,
      JSON.stringify({
        vocabularyListId,
        totalWords: uniqueWords.length,
        title: finalTitle,
        sourceLanguage: detectedSourceLang,
        succeededImages: succeededCount,
        failedImages: failedCount,
      }),
    );
  } catch (error) {
    console.error(`[process-image-vocabulary] [recognize] Failed for ${vocabularyListId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to recognize text from images';

    await repository.update(vocabularyListId, {
      status: 'FAILED',
      errorMessage,
    });

    console.error(
      `[process-image-vocabulary] [recognize] Marked as FAILED`,
      JSON.stringify({ vocabularyListId, errorMessage }),
    );
  }
}

/**
 * Phase 2: Translate recognized words into the target language.
 * Reads the existing vocabulary list from DynamoDB, extracts the word strings,
 * calls translateWords, and updates the record to COMPLETED with enriched words.
 */
async function handleTranslate(event: ProcessEvent) {
  const { vocabularyListId, userId, targetLanguage } = event;
  const repository = VocabularyListRepository.getInstance();

  console.log(
    '[process-image-vocabulary] Phase 2 (translate) invoked',
    JSON.stringify({ vocabularyListId, userId, targetLanguage }),
  );

  try {
    // Read existing vocabulary list from DynamoDB
    const existingList = await repository.getById(vocabularyListId);
    if (!existingList) {
      console.error(`[process-image-vocabulary] [translate] Vocabulary list not found: ${vocabularyListId}`);
      return;
    }

    const words = existingList.words.map((w) => w.word);
    const sourceLanguage = existingList.sourceLanguage || 'Unknown';

    if (words.length === 0) {
      console.warn(`[process-image-vocabulary] [translate] No words to translate for ${vocabularyListId}`);
      await repository.update(vocabularyListId, {
        status: 'COMPLETED',
        targetLanguage,
      });
      return;
    }

    console.log(
      `[process-image-vocabulary] [translate] Translating ${words.length} words from ${sourceLanguage} to ${targetLanguage}`,
    );

    const aiService = getAIService();
    const translatedWords = await aiService.translateWords(words, sourceLanguage, targetLanguage!, userId, {
      skipRateLimit: true,
    });

    await repository.update(vocabularyListId, {
      status: 'COMPLETED',
      targetLanguage,
      words: translatedWords,
    });

    console.log(
      `[process-image-vocabulary] [translate] COMPLETED`,
      JSON.stringify({
        vocabularyListId,
        translatedWords: translatedWords.length,
        targetLanguage,
      }),
    );
  } catch (error) {
    console.error(`[process-image-vocabulary] [translate] Failed for ${vocabularyListId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to translate words';

    await repository.update(vocabularyListId, {
      status: 'FAILED',
      errorMessage,
    });

    console.error(
      `[process-image-vocabulary] [translate] Marked as FAILED`,
      JSON.stringify({ vocabularyListId, errorMessage }),
    );
  }
}

/**
 * Legacy handler: existing behavior when phase is undefined.
 * Reads images from S3, calls analyzeImageForVocabulary, and updates the record.
 */
async function handleLegacy(event: ProcessEvent) {
  const { vocabularyListId, userId, imageS3Keys, sourceLanguage, targetLanguage } = event;
  const repository = VocabularyListRepository.getInstance();

  console.log(
    '[process-image-vocabulary] Invoked',
    JSON.stringify({
      vocabularyListId,
      userId,
      imageCount: imageS3Keys.length,
      concurrency: CONCURRENCY,
    }),
  );

  try {
    const aiService = getAIService();
    const successes: ImageResult[] = [];
    const failures: ImageFailure[] = [];

    await mapWithConcurrency(imageS3Keys, CONCURRENCY, async (s3Key, i) => {
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

        successes.push({
          index: i,
          title: result.title,
          words: result.words,
          sourceLanguage: result.sourceLanguage,
          targetLanguage: result.targetLanguage,
        });
      } catch (imageError) {
        const errorMsg = imageError instanceof Error ? imageError.message : 'Unknown error';
        console.warn(`[process-image-vocabulary] Image ${i + 1}/${imageS3Keys.length} failed, continuing: ${errorMsg}`);
        failures.push({ index: i + 1, s3Key, error: errorMsg });
      }
    });

    // Sort successes by original index so word order matches image order
    successes.sort((a, b) => a.index - b.index);

    const totalImages = imageS3Keys.length;
    const failedCount = failures.length;
    const succeededCount = successes.length;

    if (succeededCount === 0) {
      const errorMessage = `All ${totalImages} images failed to process. First error: ${failures[0]?.error}`;
      console.error(`[process-image-vocabulary] ${errorMessage}`);

      await repository.update(vocabularyListId, {
        status: 'FAILED',
        errorMessage,
      });

      console.error(`[process-image-vocabulary] Marked as FAILED`, JSON.stringify({ vocabularyListId, errorMessage }));
      return;
    }

    // Use the first successful image (by original order) for title/language detection
    const first = successes[0];
    const title = first.title;
    const detectedSourceLang = sourceLanguage || first.sourceLanguage;
    const detectedTargetLang = targetLanguage || first.targetLanguage;
    const allWords = successes.flatMap((s) => s.words);

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
}
