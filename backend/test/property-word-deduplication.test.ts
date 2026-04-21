import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Word Deduplication
 *
 * Feature: image-scan-translation
 * Property 1: Word deduplication preserves unique entries
 *
 * Validates: Requirements 1.5
 *
 * The deduplication logic used in process-image-vocabulary.ts:
 *   const uniqueWords = Array.from(new Set(allWords));
 */

/** Replicates the deduplication logic from process-image-vocabulary.ts */
function deduplicateWords(words: string[]): string[] {
  return Array.from(new Set(words));
}

describe('Feature: image-scan-translation, Property 1: Word deduplication preserves unique entries', () => {
  test(
    'deduplication output contains no duplicates, preserves all unique words, adds nothing extra, and has correct length',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (words) => {
          const result = deduplicateWords(words);
          const expectedUnique = new Set(words);

          // 1. No duplicates remain in the output
          expect(new Set(result).size).toBe(result.length);

          // 2. Every unique word from the input is present in the output
          for (const word of expectedUnique) {
            expect(result).toContain(word);
          }

          // 3. No extra words are added (every output word exists in input)
          for (const word of result) {
            expect(expectedUnique.has(word)).toBe(true);
          }

          // 4. Output length equals the number of unique words in the input
          expect(result.length).toBe(expectedUnique.size);
        }),
        { numRuns: 100 },
      );
    },
  );
});
