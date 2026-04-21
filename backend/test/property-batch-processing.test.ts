import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Batch Processing Resilience
 *
 * Feature: image-scan-translation
 * Property 2: Batch processing resilience
 *
 * Validates: Requirements 1.6, 5.7, 5.8
 *
 * Replicates the batch processing logic from process-image-vocabulary.ts (handleRecognize):
 * - Each image independently succeeds (producing words) or fails
 * - If ALL images fail → status is 'FAILED'
 * - If at least one succeeds → status is 'RECOGNIZED'
 * - When some images fail, errorMessage = `${failedCount}/${totalImages} images failed to process`
 * - When no images fail, errorMessage is undefined
 * - Words from all successful images are collected and deduplicated
 */

/** Represents a single image processing result */
type ImageOutcome = { success: true; words: string[] } | { success: false; error: string };

/** Replicates the batch status/word aggregation logic from handleRecognize */
function processBatch(outcomes: ImageOutcome[]): {
  status: 'FAILED' | 'RECOGNIZED';
  errorMessage: string | undefined;
  words: string[];
} {
  const totalImages = outcomes.length;
  const successes = outcomes.filter((o): o is Extract<ImageOutcome, { success: true }> => o.success);
  const failedCount = totalImages - successes.length;

  if (successes.length === 0) {
    const firstError =
      outcomes.find((o): o is Extract<ImageOutcome, { success: false }> => !o.success)?.error ?? 'Unknown error';
    return {
      status: 'FAILED',
      errorMessage: `All ${totalImages} images failed to process. First error: ${firstError}`,
      words: [],
    };
  }

  // Collect all words from successful images and deduplicate
  const allWords = successes.flatMap((s) => s.words);
  const uniqueWords = Array.from(new Set(allWords));

  const isPartial = failedCount > 0;
  const errorMessage = isPartial ? `${failedCount}/${totalImages} images failed to process` : undefined;

  return {
    status: 'RECOGNIZED',
    errorMessage,
    words: uniqueWords,
  };
}

/** Arbitrary for a successful image outcome with random words */
const successOutcome = fc
  .array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 10 })
  .map((words): ImageOutcome => ({ success: true, words }));

/** Arbitrary for a failed image outcome */
const failureOutcome = fc.string({ minLength: 1 }).map((error): ImageOutcome => ({ success: false, error }));

/** Arbitrary for a single image outcome (success or failure) */
const imageOutcome = fc.oneof(successOutcome, failureOutcome);

describe('Feature: image-scan-translation, Property 2: Batch processing resilience', () => {
  test('all images fail → status is FAILED', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.array(failureOutcome, { minLength: 1, maxLength: 20 }), (outcomes) => {
        const result = processBatch(outcomes);

        expect(result.status).toBe('FAILED');
        expect(result.words).toEqual([]);
        expect(result.errorMessage).toContain('failed to process');
      }),
      { numRuns: 100 },
    );
  });

  test(
    'some images fail but not all → status is RECOGNIZED with error message mentioning failed count',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          fc.array(successOutcome, { minLength: 1, maxLength: 10 }),
          fc.array(failureOutcome, { minLength: 1, maxLength: 10 }),
          (successes, failures) => {
            // Interleave successes and failures to form a mixed batch
            const outcomes: ImageOutcome[] = [...successes, ...failures];
            const result = processBatch(outcomes);

            const totalImages = outcomes.length;
            const failedCount = failures.length;

            expect(result.status).toBe('RECOGNIZED');
            expect(result.errorMessage).toBe(`${failedCount}/${totalImages} images failed to process`);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  test('no images fail → status is RECOGNIZED with no error message', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.array(successOutcome, { minLength: 1, maxLength: 20 }), (outcomes) => {
        const result = processBatch(outcomes);

        expect(result.status).toBe('RECOGNIZED');
        expect(result.errorMessage).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  test('words from all successful images are included and deduplicated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.array(imageOutcome, { minLength: 1, maxLength: 20 }), (outcomes) => {
        const result = processBatch(outcomes);

        const successfulOutcomes = outcomes.filter((o): o is Extract<ImageOutcome, { success: true }> => o.success);

        if (successfulOutcomes.length === 0) {
          // All failed — no words expected
          expect(result.words).toEqual([]);
          return;
        }

        // Collect expected unique words from all successful images
        const expectedWords = new Set(successfulOutcomes.flatMap((s) => s.words));

        // Every expected word is present
        for (const word of expectedWords) {
          expect(result.words).toContain(word);
        }

        // No duplicates in result
        expect(new Set(result.words).size).toBe(result.words.length);

        // Result length matches expected unique count
        expect(result.words.length).toBe(expectedWords.size);
      }),
      { numRuns: 100 },
    );
  });

  test('failed images contribute no words to the result', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.array(imageOutcome, { minLength: 1, maxLength: 20 }), (outcomes) => {
        const result = processBatch(outcomes);

        // Words in the result should only come from successful images
        const successWords = new Set(
          outcomes.filter((o): o is Extract<ImageOutcome, { success: true }> => o.success).flatMap((s) => s.words),
        );

        for (const word of result.words) {
          expect(successWords.has(word)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
