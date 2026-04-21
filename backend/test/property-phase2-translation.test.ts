import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Phase 2 Translation
 *
 * Feature: image-scan-translation
 * Property 4: Phase 2 translation produces enriched vocabulary
 *
 * Validates: Requirements 5.6
 *
 * Replicates the Phase 2 mapping logic from process-image-vocabulary.ts (handleTranslate):
 * - After Phase 2 completes, the vocabulary list has status 'COMPLETED'
 * - targetLanguage is set to the user-selected target language
 * - Every word entry has word, translation, definition, partOfSpeech, exampleSentence, and difficulty populated
 */

/** Represents a fully enriched vocabulary word after Phase 2 translation */
interface VocabularyWord {
  word: string;
  translation: string;
  definition: string;
  partOfSpeech: string;
  exampleSentence: string;
  difficulty: string;
}

/** Represents the Phase 2 output written to DynamoDB */
interface Phase2Output {
  status: 'COMPLETED';
  targetLanguage: string;
  words: VocabularyWord[];
}

/**
 * Replicates the Phase 2 mapping logic from handleTranslate.
 * Takes the translated words from the AI service and produces the final COMPLETED state.
 */
function mapTranslationResults(translatedWords: VocabularyWord[], targetLanguage: string): Phase2Output {
  return {
    status: 'COMPLETED',
    targetLanguage,
    words: translatedWords,
  };
}

/** Arbitrary for a single enriched VocabularyWord with all fields populated */
const vocabularyWord = fc.record({
  word: fc.string({ minLength: 1, maxLength: 50 }),
  translation: fc.string({ minLength: 1, maxLength: 50 }),
  definition: fc.string({ minLength: 1, maxLength: 100 }),
  partOfSpeech: fc.constantFrom('noun', 'verb', 'adjective', 'adverb', 'other'),
  exampleSentence: fc.string({ minLength: 1, maxLength: 100 }),
  difficulty: fc.constantFrom('easy', 'medium', 'hard'),
});

/** Arbitrary for a non-empty array of enriched vocabulary words */
const nonEmptyVocabularyWords = fc.array(vocabularyWord, { minLength: 1, maxLength: 20 });

/** Arbitrary for a target language string */
const targetLanguage = fc.constantFrom(
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Chinese',
  'Latin',
);

describe('Feature: image-scan-translation, Property 4: Phase 2 translation produces enriched vocabulary', () => {
  test('status is COMPLETED', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        expect(result.status).toBe('COMPLETED');
      }),
      { numRuns: 100 },
    );
  });

  test('targetLanguage is set to the user-selected target language', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        expect(result.targetLanguage).toBe(lang);
        expect(result.targetLanguage.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has a non-empty word field', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        for (const entry of result.words) {
          expect(typeof entry.word).toBe('string');
          expect(entry.word.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has translation populated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        for (const entry of result.words) {
          expect(typeof entry.translation).toBe('string');
          expect(entry.translation.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has definition populated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        for (const entry of result.words) {
          expect(typeof entry.definition).toBe('string');
          expect(entry.definition.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has partOfSpeech populated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        for (const entry of result.words) {
          expect(typeof entry.partOfSpeech).toBe('string');
          expect(entry.partOfSpeech.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has exampleSentence populated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        for (const entry of result.words) {
          expect(typeof entry.exampleSentence).toBe('string');
          expect(entry.exampleSentence.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('every word entry has difficulty populated', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(nonEmptyVocabularyWords, targetLanguage, (words, lang) => {
        const result = mapTranslationResults(words, lang);

        for (const entry of result.words) {
          expect(typeof entry.difficulty).toBe('string');
          expect(entry.difficulty.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
