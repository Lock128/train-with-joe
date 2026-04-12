import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AIService } from '../src/services/ai-service';
import { mockClient } from 'aws-sdk-client-mock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { AIExercise } from '../src/model/domain/Training';

/**
 * Property-Based Tests for AI Service
 */

const bedrockMock = mockClient(BedrockRuntimeClient);

// Shared arbitraries for valid exercises
const validExerciseArb: fc.Arbitrary<AIExercise> = fc
  .record({
    prompt: fc.string({ minLength: 1, maxLength: 100 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 3, maxLength: 5 }),
    exerciseType: fc.constantFrom('verb_conjugation', 'preposition', 'fill_in_the_blank', 'sentence_completion'),
    sourceWord: fc.string({ minLength: 1, maxLength: 30 }),
  })
  .map((rec) => ({
    ...rec,
    correctOptionIndex: 0, // always valid index
  }));

// Arbitrary for invalid exercises (missing or malformed fields)
const invalidExerciseArb = fc.oneof(
  // Missing prompt
  fc.record({
    options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 5 }),
    correctOptionIndex: fc.constant(0),
    exerciseType: fc.constant('fill_in_the_blank'),
    sourceWord: fc.string({ minLength: 1, maxLength: 20 }),
  }),
  // Too few options
  fc.record({
    prompt: fc.string({ minLength: 1, maxLength: 50 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 2 }),
    correctOptionIndex: fc.constant(0),
    exerciseType: fc.constant('fill_in_the_blank'),
    sourceWord: fc.string({ minLength: 1, maxLength: 20 }),
  }),
  // Empty sourceWord
  fc.record({
    prompt: fc.string({ minLength: 1, maxLength: 50 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 5 }),
    correctOptionIndex: fc.constant(0),
    exerciseType: fc.constant('fill_in_the_blank'),
    sourceWord: fc.constant(''),
  }),
  // correctOptionIndex out of bounds
  fc.record({
    prompt: fc.string({ minLength: 1, maxLength: 50 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 3 }),
    correctOptionIndex: fc.constant(99),
    exerciseType: fc.constant('fill_in_the_blank'),
    sourceWord: fc.string({ minLength: 1, maxLength: 20 }),
  }),
);

/**
 * Helper: create Titan-format Bedrock response
 */
function createBedrockResponse(text: string) {
  return {
    body: new TextEncoder().encode(JSON.stringify({ results: [{ outputText: text }] })),
  };
}

describe('AI Service Property Tests', () => {
  beforeEach(() => {
    bedrockMock.reset();
  });

  /**
   * Property 2: Prompt construction
   * For random words and languages, the prompt sent to Bedrock includes all word fields and both language names.
   */
  test('Property 2: Prompt construction includes all words and languages', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            word: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('"')),
            translation: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('"')),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        async (words, sourceLanguage, targetLanguage) => {
          bedrockMock.reset();

          let capturedBody: string | undefined;

          bedrockMock.on(InvokeModelCommand).callsFake((input) => {
            capturedBody = typeof input.body === 'string' ? input.body : new TextDecoder().decode(input.body);

            // Return a valid exercises response
            const exercises = words.map((w) => ({
              prompt: `What is the translation of ${w.word}?`,
              options: ['opt_a', 'opt_b', 'opt_c'],
              correctOptionIndex: 0,
              exerciseType: 'fill_in_the_blank',
              sourceWord: w.word,
            }));

            return createBedrockResponse(JSON.stringify(exercises));
          });

          const service = AIService.getInstance();
          const userId = `user-prop2-${Date.now()}-${Math.random()}`;

          await service.generateExercises(words, sourceLanguage, targetLanguage, userId);

          expect(capturedBody).toBeDefined();

          // The body contains the prompt within the request body structure
          // For Titan format: { inputText: prompt, ... }
          const parsedBody = JSON.parse(capturedBody!);
          const prompt: string = parsedBody.inputText;

          // Verify prompt contains both language names
          expect(prompt).toContain(sourceLanguage);
          expect(prompt).toContain(targetLanguage);

          // Verify prompt contains all word fields
          for (const w of words) {
            expect(prompt).toContain(w.word);
            expect(prompt).toContain(w.translation);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Parsing validation
   * For any array mixing valid and invalid exercises, parseAndValidateExercises returns only valid ones.
   */
  test('Property 3: Parsing returns only valid exercises from mixed input', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.property(
        fc.array(validExerciseArb, { minLength: 0, maxLength: 5 }),
        fc.array(invalidExerciseArb, { minLength: 0, maxLength: 5 }),
        (validExercises, invalidExercises) => {
          const mixed = [...validExercises, ...invalidExercises];
          // Shuffle the array deterministically
          const shuffled = mixed.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

          const service = AIService.getInstance();
          const result = service.parseAndValidateExercises(JSON.stringify(shuffled));

          // All returned exercises must be valid
          for (const exercise of result) {
            expect(typeof exercise.prompt).toBe('string');
            expect(exercise.prompt.length).toBeGreaterThan(0);
            expect(Array.isArray(exercise.options)).toBe(true);
            expect(exercise.options.length).toBeGreaterThanOrEqual(3);
            expect(exercise.options.length).toBeLessThanOrEqual(5);
            expect(typeof exercise.correctOptionIndex).toBe('number');
            expect(exercise.correctOptionIndex).toBeGreaterThanOrEqual(0);
            expect(exercise.correctOptionIndex).toBeLessThan(exercise.options.length);
            expect(typeof exercise.exerciseType).toBe('string');
            expect(exercise.exerciseType.length).toBeGreaterThan(0);
            expect(typeof exercise.sourceWord).toBe('string');
            expect(exercise.sourceWord.length).toBeGreaterThan(0);
          }

          // Result count should be <= total input count
          expect(result.length).toBeLessThanOrEqual(shuffled.length);

          // Result count should be >= valid exercise count (all valid ones should pass)
          // Note: some "invalid" exercises might accidentally be valid, so we just check
          // that valid exercises pass through
          for (const valid of validExercises) {
            const found = result.some(
              (r) =>
                r.prompt === valid.prompt && r.sourceWord === valid.sourceWord && r.exerciseType === valid.exerciseType,
            );
            expect(found).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Round-trip serialization
   * For any valid AIExercise, JSON.stringify then JSON.parse is equivalent.
   */
  test('Property 4: Round-trip serialization preserves exercises', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.property(validExerciseArb, (exercise) => {
        const serialized = JSON.stringify(exercise);
        const deserialized = JSON.parse(serialized) as AIExercise;

        expect(deserialized.prompt).toBe(exercise.prompt);
        expect(deserialized.options).toEqual(exercise.options);
        expect(deserialized.correctOptionIndex).toBe(exercise.correctOptionIndex);
        expect(deserialized.exerciseType).toBe(exercise.exerciseType);
        expect(deserialized.sourceWord).toBe(exercise.sourceWord);

        // Deep equality
        expect(deserialized).toEqual(exercise);
      }),
      { numRuns: 100 },
    );
  });
});
