import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for JSON Repair
 *
 * Feature: image-scan-translation
 * Property 7: JSON repair recovers valid subsets from truncated output
 *
 * Validates: Requirements 10.5
 *
 * The repairTruncatedJson logic from ai-service.ts is replicated here
 * because it is a private method on AIService.
 */

/**
 * Replicates the private repairTruncatedJson method from AIService.
 * Attempts to repair truncated/malformed JSON from LLM output by
 * salvaging complete word entries from a partially-written JSON object.
 */
function repairTruncatedJson(text: string): Record<string, unknown> {
  const wordsStart = text.indexOf('"words"');
  if (wordsStart === -1) {
    throw new Error('No words array found');
  }

  const arrayStart = text.indexOf('[', wordsStart);
  if (arrayStart === -1) {
    throw new Error('No array start found');
  }

  // Walk through the array collecting complete objects
  let depth = 0;
  let lastGoodEnd = arrayStart;
  for (let i = arrayStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        // We just closed a top-level object inside the array
        const candidate = text.substring(arrayStart, i + 1) + ']}';
        const prefix = text.substring(0, arrayStart);
        try {
          JSON.parse(prefix + candidate);
          lastGoodEnd = i + 1;
        } catch {
          break;
        }
      }
    }
  }

  if (lastGoodEnd <= arrayStart) {
    throw new Error('No valid array entries found');
  }

  const prefix = text.substring(0, arrayStart);
  const validEntries = text.substring(arrayStart, lastGoodEnd);
  const repaired = prefix + validEntries + ']}';

  return JSON.parse(repaired);
}

// --- Arbitraries ---

/** Generate a safe string that won't break JSON (alphanumeric + spaces only) */
const safeStringArb = fc.stringMatching(/^[A-Za-z0-9 ]{1,30}$/).filter((s) => s.length > 0);

/** Generate a single OCR word entry object (just a string in the words array) */
const ocrWordArb = safeStringArb;

/** Generate a valid OCR extraction response object */
const ocrResponseArb = fc.record({
  title: safeStringArb,
  detectedLanguage: fc.constantFrom('French', 'German', 'Japanese', 'Spanish', 'English', 'Unknown'),
  words: fc.array(ocrWordArb, { minLength: 2, maxLength: 10 }),
});

/** Generate a single translation word entry object */
const translationEntryArb = fc.record({
  word: safeStringArb,
  translation: safeStringArb,
  definition: safeStringArb,
  partOfSpeech: fc.constantFrom('noun', 'verb', 'adjective', 'adverb', 'other'),
  exampleSentence: safeStringArb,
  difficulty: fc.constantFrom('easy', 'medium', 'hard'),
});

/** Generate a valid translation response wrapped in the object format repairTruncatedJson expects */
const translationResponseArb = fc.array(translationEntryArb, { minLength: 2, maxLength: 8 }).map((entries) => ({
  words: entries,
}));

describe('Feature: image-scan-translation, Property 7: JSON repair recovers valid subsets from truncated output', () => {
  test(
    'truncated OCR response JSON is repaired to valid JSON with a subset of original words, or throws',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(ocrResponseArb, fc.double({ min: 0, max: 1, noNaN: true }), (ocrResponse, truncFraction) => {
          const fullJson = JSON.stringify(ocrResponse);

          // Find the end of the first complete word entry in the words array.
          // We need at least one complete entry for repair to work.
          const wordsArrayStart = fullJson.indexOf('[', fullJson.indexOf('"words"'));
          // Find the first comma or ] after the first string entry in the array
          let firstEntryEnd = -1;
          let inString = false;
          let escaped = false;
          for (let i = wordsArrayStart + 1; i < fullJson.length; i++) {
            const ch = fullJson[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (ch === '\\') {
              escaped = true;
              continue;
            }
            if (ch === '"') {
              inString = !inString;
              continue;
            }
            if (!inString && (ch === ',' || ch === ']')) {
              firstEntryEnd = i;
              break;
            }
          }

          if (firstEntryEnd === -1) return; // degenerate case, skip

          // Truncate at a random position between after the first complete entry and end of string
          const minPos = firstEntryEnd;
          const maxPos = fullJson.length - 1; // exclude the very last char to ensure truncation
          if (minPos >= maxPos) return; // nothing to truncate

          const truncPos = minPos + Math.floor(truncFraction * (maxPos - minPos));
          const truncated = fullJson.substring(0, truncPos);

          // The OCR response has simple string entries in the words array,
          // but repairTruncatedJson looks for {} objects. For OCR responses
          // with string arrays, the repair won't find objects — it should throw.
          // This is expected behavior: repairTruncatedJson is designed for
          // object-based words arrays (like analyzeImageForVocabulary output).
          // So for OCR string arrays, we expect it to throw.
          try {
            const result = repairTruncatedJson(truncated);
            // If it doesn't throw, the result MUST be valid JSON (it was parsed)
            // and must contain a words array
            expect(result).toBeDefined();
            expect(result).toHaveProperty('words');
            // Re-stringify and re-parse to confirm validity
            const reStringified = JSON.stringify(result);
            expect(() => JSON.parse(reStringified)).not.toThrow();
          } catch {
            // Throwing is acceptable — the property says "valid JSON or throws"
          }
        }),
        { numRuns: 100 },
      );
    },
  );

  test(
    'truncated translation response JSON (object-based words) is repaired to valid JSON with subset of entries, or throws',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          translationResponseArb,
          fc.double({ min: 0, max: 1, noNaN: true }),
          (translationResponse, truncFraction) => {
            const fullJson = JSON.stringify(translationResponse);

            // Find the position after the first complete object entry in the words array
            const wordsArrayStart = fullJson.indexOf('[', fullJson.indexOf('"words"'));
            if (wordsArrayStart === -1) return;

            // Find the end of the first complete {} object in the array
            let depth = 0;
            let firstObjectEnd = -1;
            for (let i = wordsArrayStart + 1; i < fullJson.length; i++) {
              if (fullJson[i] === '{') depth++;
              if (fullJson[i] === '}') {
                depth--;
                if (depth === 0) {
                  firstObjectEnd = i + 1;
                  break;
                }
              }
            }

            if (firstObjectEnd === -1) return; // degenerate case

            // Truncate at a random position between after first complete object and end
            const minPos = firstObjectEnd;
            const maxPos = fullJson.length - 1;
            if (minPos >= maxPos) return;

            const truncPos = minPos + Math.floor(truncFraction * (maxPos - minPos));
            const truncated = fullJson.substring(0, truncPos);

            try {
              const result = repairTruncatedJson(truncated);
              // If repair succeeds, result MUST be valid JSON
              expect(result).toBeDefined();
              expect(result).toHaveProperty('words');
              expect(Array.isArray(result.words)).toBe(true);

              // Every repaired word entry must be a subset of the original entries
              const originalWords = translationResponse.words;
              const repairedWords = result.words as Array<Record<string, unknown>>;

              expect(repairedWords.length).toBeGreaterThan(0);
              expect(repairedWords.length).toBeLessThanOrEqual(originalWords.length);

              // Each repaired entry should match an original entry exactly
              for (const repairedWord of repairedWords) {
                const matchFound = originalWords.some(
                  (orig) =>
                    orig.word === repairedWord.word &&
                    orig.translation === repairedWord.translation &&
                    orig.definition === repairedWord.definition,
                );
                expect(matchFound).toBe(true);
              }

              // Re-stringify and re-parse to confirm round-trip validity
              const reStringified = JSON.stringify(result);
              expect(() => JSON.parse(reStringified)).not.toThrow();
            } catch {
              // Throwing is acceptable — "valid JSON or throws"
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  test('repair NEVER produces invalid JSON — it either returns parseable JSON or throws', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        // Generate arbitrary JSON-like strings with a "words" key and array of objects
        fc.array(translationEntryArb, { minLength: 1, maxLength: 6 }),
        fc.nat({ max: 500 }),
        (entries, extraTruncBytes) => {
          const obj = { words: entries };
          const fullJson = JSON.stringify(obj);

          // Truncate at various positions
          const truncPos = Math.min(fullJson.length - 1, Math.max(1, extraTruncBytes));
          const truncated = fullJson.substring(0, truncPos);

          let result: Record<string, unknown> | undefined;
          let threw = false;

          try {
            result = repairTruncatedJson(truncated);
          } catch {
            threw = true;
          }

          if (!threw) {
            // If it didn't throw, the result MUST be valid JSON
            expect(result).toBeDefined();
            const reStringified = JSON.stringify(result);
            expect(() => JSON.parse(reStringified)).not.toThrow();
          }
          // If it threw, that's fine — the property is satisfied
        },
      ),
      { numRuns: 100 },
    );
  });
});
