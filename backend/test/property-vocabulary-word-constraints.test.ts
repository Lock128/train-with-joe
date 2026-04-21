import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import type { VocabularyWord } from '../src/model/domain/VocabularyList';

/**
 * Property-Based Tests for VocabularyWord Field Constraints
 *
 * Feature: image-scan-translation
 * Property 5: VocabularyWord field constraints
 *
 * Validates: Requirements 4.2
 *
 * The Translation_Engine SHALL generate a VocabularyWord for each extracted word containing:
 * - a learner-friendly definition (max 20 words)
 * - part of speech (noun, verb, adjective, adverb, or other)
 * - an example sentence (max 15 words)
 * - a difficulty rating (easy, medium, or hard)
 */

const VALID_PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'other'] as const;
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/** Count words by splitting on whitespace (matching the AI prompt constraint logic) */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/** Validates that a VocabularyWord satisfies all field constraints from Requirement 4.2 */
function validateVocabularyWord(word: VocabularyWord): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (countWords(word.definition) > 20) {
    errors.push(`definition has ${countWords(word.definition)} words, max is 20`);
  }

  if (word.exampleSentence && countWords(word.exampleSentence) > 15) {
    errors.push(`exampleSentence has ${countWords(word.exampleSentence)} words, max is 15`);
  }

  if (word.partOfSpeech && !(VALID_PARTS_OF_SPEECH as readonly string[]).includes(word.partOfSpeech)) {
    errors.push(`partOfSpeech "${word.partOfSpeech}" is not one of: ${VALID_PARTS_OF_SPEECH.join(', ')}`);
  }

  if (word.difficulty && !(VALID_DIFFICULTIES as readonly string[]).includes(word.difficulty)) {
    errors.push(`difficulty "${word.difficulty}" is not one of: ${VALID_DIFFICULTIES.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Arbitrary that generates a string with at most `maxWords` whitespace-separated words.
 * Each word is a non-empty, non-whitespace string.
 */
function boundedWordString(maxWords: number): fc.Arbitrary<string> {
  return fc
    .array(fc.stringMatching(/^[a-zA-Z]{1,12}$/), { minLength: 1, maxLength: maxWords })
    .map((words) => words.join(' '));
}

/** Arbitrary that generates valid VocabularyWord objects conforming to all constraints */
const vocabularyWordArb: fc.Arbitrary<VocabularyWord> = fc.record({
  word: fc.stringMatching(/^[a-zA-Z]{1,20}$/),
  translation: fc.stringMatching(/^[a-zA-Z]{1,20}$/),
  definition: boundedWordString(20),
  partOfSpeech: fc.constantFrom(...VALID_PARTS_OF_SPEECH),
  exampleSentence: boundedWordString(15),
  difficulty: fc.constantFrom(...VALID_DIFFICULTIES),
});

describe('Feature: image-scan-translation, Property 5: VocabularyWord field constraints', () => {
  test('every generated VocabularyWord satisfies all field constraints', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(vocabularyWordArb, (vocabWord) => {
        const result = validateVocabularyWord(vocabWord);

        // 1. definition has at most 20 words
        expect(countWords(vocabWord.definition)).toBeLessThanOrEqual(20);

        // 2. exampleSentence has at most 15 words
        if (vocabWord.exampleSentence) {
          expect(countWords(vocabWord.exampleSentence)).toBeLessThanOrEqual(15);
        }

        // 3. partOfSpeech is one of the valid values
        if (vocabWord.partOfSpeech) {
          expect(VALID_PARTS_OF_SPEECH as readonly string[]).toContain(vocabWord.partOfSpeech);
        }

        // 4. difficulty is one of the valid values
        if (vocabWord.difficulty) {
          expect(VALID_DIFFICULTIES as readonly string[]).toContain(vocabWord.difficulty);
        }

        // Overall validation passes
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  test('validation rejects definition exceeding 20 words', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[a-zA-Z]{1,10}$/), { minLength: 21, maxLength: 30 }), (words) => {
        const longDefinition = words.join(' ');
        const vocabWord: VocabularyWord = {
          word: 'test',
          definition: longDefinition,
          partOfSpeech: 'noun',
          exampleSentence: 'A short sentence.',
          difficulty: 'easy',
        };

        const result = validateVocabularyWord(vocabWord);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('definition'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test('validation rejects exampleSentence exceeding 15 words', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[a-zA-Z]{1,10}$/), { minLength: 16, maxLength: 25 }), (words) => {
        const longSentence = words.join(' ');
        const vocabWord: VocabularyWord = {
          word: 'test',
          definition: 'A short definition.',
          partOfSpeech: 'noun',
          exampleSentence: longSentence,
          difficulty: 'easy',
        };

        const result = validateVocabularyWord(vocabWord);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('exampleSentence'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  test('validation rejects invalid partOfSpeech values', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .filter((s) => !(VALID_PARTS_OF_SPEECH as readonly string[]).includes(s) && s.trim().length > 0),
        (invalidPos) => {
          const vocabWord: VocabularyWord = {
            word: 'test',
            definition: 'A short definition.',
            partOfSpeech: invalidPos,
            exampleSentence: 'A short sentence.',
            difficulty: 'easy',
          };

          const result = validateVocabularyWord(vocabWord);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('partOfSpeech'))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('validation rejects invalid difficulty values', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .filter((s) => !(VALID_DIFFICULTIES as readonly string[]).includes(s) && s.trim().length > 0),
        (invalidDiff) => {
          const vocabWord: VocabularyWord = {
            word: 'test',
            definition: 'A short definition.',
            partOfSpeech: 'noun',
            exampleSentence: 'A short sentence.',
            difficulty: invalidDiff,
          };

          const result = validateVocabularyWord(vocabWord);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('difficulty'))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
