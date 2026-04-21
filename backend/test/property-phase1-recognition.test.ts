import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Phase 1 Recognition
 *
 * Feature: image-scan-translation
 * Property 3: Phase 1 recognition produces untranslated word list
 *
 * Validates: Requirements 5.3
 *
 * Replicates the Phase 1 mapping logic from process-image-vocabulary.ts (handleRecognize):
 * - Each successful extraction returns { detectedLanguage, words[] }
 * - Words across all images are collected and deduplicated
 * - Each word is mapped to a VocabularyWord with only `word` and `definition: 'Pending translation'`
 * - sourceLanguage is set to the detectedLanguage of the first successful image
 * - No enrichment fields (translation, partOfSpeech, exampleSentence, difficulty) are populated
 * - Status is 'RECOGNIZED'
 */

/** Represents a successful extraction result from a single image */
interface ExtractionResult {
  detectedLanguage: string;
  words: string[];
}

/** Represents the Phase 1 output written to DynamoDB */
interface Phase1Output {
  status: 'RECOGNIZED';
  sourceLanguage: string;
  words: Array<{
    word: string;
    definition: string;
    translation?: string;
    partOfSpeech?: string;
    exampleSentence?: string;
    difficulty?: string;
  }>;
}

/**
 * Replicates the Phase 1 mapping logic from handleRecognize.
 * Assumes at least one successful extraction (the caller filters out all-failure cases).
 */
function mapRecognitionResults(extractions: ExtractionResult[]): Phase1Output {
  // Collect all words from all successful images and deduplicate
  const allWords = extractions.flatMap((e) => e.words);
  const uniqueWords = Array.from(new Set(allWords));

  // Map to VocabularyWord[] with only word populated and placeholder definition
  const vocabularyWords = uniqueWords.map((word) => ({
    word,
    definition: 'Pending translation',
  }));

  // Use the first successful image for language detection
  const detectedSourceLang = extractions[0].detectedLanguage;

  return {
    status: 'RECOGNIZED',
    sourceLanguage: detectedSourceLang,
    words: vocabularyWords,
  };
}

/** Arbitrary for a single extraction result with non-empty language and words */
const extractionResult = fc.record({
  detectedLanguage: fc.string({ minLength: 1, maxLength: 30 }),
  words: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 15 }),
});

/** Arbitrary for at least one successful extraction (Phase 1 only runs when ≥1 image succeeds) */
const nonEmptyExtractions = fc.array(extractionResult, { minLength: 1, maxLength: 10 });

describe('Feature: image-scan-translation, Property 3: Phase 1 recognition produces untranslated word list', () => {
  test('every word entry has a non-empty word field', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyExtractions, (extractions) => {
        const result = mapRecognitionResults(extractions);

        for (const entry of result.words) {
          expect(typeof entry.word).toBe('string');
          expect(entry.word.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has translation undefined or empty', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyExtractions, (extractions) => {
        const result = mapRecognitionResults(extractions);

        for (const entry of result.words) {
          expect(entry.translation === undefined || entry.translation === '').toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has definition set to "Pending translation"', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyExtractions, (extractions) => {
        const result = mapRecognitionResults(extractions);

        for (const entry of result.words) {
          expect(entry.definition).toBe('Pending translation');
        }
      }),
      { numRuns: 100 },
    );
  });

  test('sourceLanguage is set to the detected language of the first extraction', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyExtractions, (extractions) => {
        const result = mapRecognitionResults(extractions);

        expect(result.sourceLanguage).toBe(extractions[0].detectedLanguage);
        expect(result.sourceLanguage.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  test('status is RECOGNIZED', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyExtractions, (extractions) => {
        const result = mapRecognitionResults(extractions);

        expect(result.status).toBe('RECOGNIZED');
      }),
      { numRuns: 100 },
    );
  });

  test('no enrichment fields (partOfSpeech, exampleSentence, difficulty) are populated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyExtractions, (extractions) => {
        const result = mapRecognitionResults(extractions);

        for (const entry of result.words) {
          expect(entry.partOfSpeech).toBeUndefined();
          expect(entry.exampleSentence).toBeUndefined();
          expect(entry.difficulty).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
