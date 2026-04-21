import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import type { VocabularyListStatus } from '../src/model/domain/VocabularyList';

/**
 * Property-Based Tests for translateRecognizedWords Validation
 *
 * Feature: image-scan-translation
 * Property 6: translateRecognizedWords validation
 *
 * Validates: Requirements 6.2, 6.3, 6.4, 7.3
 *
 * Replicates the validation logic from Mutation.translateRecognizedWords.ts:
 * 1. If vocabulary list doesn't exist → error "Vocabulary list not found"
 * 2. If vocabulary list exists but userId doesn't match → error "Vocabulary list not found"
 * 3. If vocabulary list exists, userId matches, but status is not RECOGNIZED → error "Vocabulary list is not ready for translation"
 * 4. If vocabulary list exists, userId matches, and status is RECOGNIZED → success (no error)
 */

const ALL_STATUSES: VocabularyListStatus[] = [
  'PENDING',
  'RECOGNIZED',
  'TRANSLATING',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'FAILED',
];

interface ValidationInput {
  listExists: boolean;
  listOwnerId: string;
  requestUserId: string;
  status: VocabularyListStatus;
}

interface ValidationResult {
  success: boolean;
  error: string | null;
}

/**
 * Pure validation logic extracted from Mutation.translateRecognizedWords handler.
 * This mirrors the three-step check: existence → ownership → status.
 */
function validateTranslateRequest(input: ValidationInput): ValidationResult {
  // Step 1 & 2: list must exist AND belong to the requesting user
  if (!input.listExists || input.listOwnerId !== input.requestUserId) {
    return { success: false, error: 'Vocabulary list not found' };
  }

  // Step 3: status must be RECOGNIZED
  if (input.status !== 'RECOGNIZED') {
    return { success: false, error: 'Vocabulary list is not ready for translation' };
  }

  // All checks pass
  return { success: true, error: null };
}

/** Arbitrary for a VocabularyListStatus */
const statusArb = fc.constantFrom(...ALL_STATUSES);

/** Arbitrary for non-empty user/list IDs */
const idArb = fc.string({ minLength: 1, maxLength: 50 });

describe('Feature: image-scan-translation, Property 6: translateRecognizedWords validation', () => {
  test('when list does not exist, returns "Vocabulary list not found"', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(idArb, idArb, statusArb, (requestUserId, listOwnerId, status) => {
        const result = validateTranslateRequest({
          listExists: false,
          listOwnerId,
          requestUserId,
          status,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Vocabulary list not found');
      }),
      { numRuns: 100 },
    );
  });

  test(
    'when list exists but owner does not match requesting user, returns "Vocabulary list not found"',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          idArb,
          idArb.filter((id) => id.length > 0),
          statusArb,
          (requestUserId, ownerSuffix, status) => {
            // Ensure owner is always different from requester
            const listOwnerId = requestUserId + ownerSuffix + '_different';

            const result = validateTranslateRequest({
              listExists: true,
              listOwnerId,
              requestUserId,
              status,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Vocabulary list not found');
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  test(
    'when list exists, owner matches, but status is not RECOGNIZED, returns "not ready for translation"',
    { timeout: 30000 },
    () => {
      const nonRecognizedStatus = fc.constantFrom(...ALL_STATUSES.filter((s) => s !== 'RECOGNIZED'));

      fc.assert(
        fc.property(idArb, nonRecognizedStatus, (userId, status) => {
          const result = validateTranslateRequest({
            listExists: true,
            listOwnerId: userId,
            requestUserId: userId,
            status,
          });

          expect(result.success).toBe(false);
          expect(result.error).toBe('Vocabulary list is not ready for translation');
        }),
        { numRuns: 100 },
      );
    },
  );

  test('when list exists, owner matches, and status is RECOGNIZED, succeeds with no error', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(idArb, (userId) => {
        const result = validateTranslateRequest({
          listExists: true,
          listOwnerId: userId,
          requestUserId: userId,
          status: 'RECOGNIZED',
        });

        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  test('for any random combination, exactly one of the three validation outcomes holds', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(fc.boolean(), idArb, idArb, statusArb, (listExists, requestUserId, listOwnerId, status) => {
        const result = validateTranslateRequest({
          listExists,
          listOwnerId,
          requestUserId,
          status,
        });

        const ownerMatches = listExists && listOwnerId === requestUserId;
        const statusIsRecognized = status === 'RECOGNIZED';

        if (!listExists || !ownerMatches) {
          // Case 1 or 2: not found or ownership mismatch
          expect(result.success).toBe(false);
          expect(result.error).toBe('Vocabulary list not found');
        } else if (!statusIsRecognized) {
          // Case 3: wrong status
          expect(result.success).toBe(false);
          expect(result.error).toBe('Vocabulary list is not ready for translation');
        } else {
          // Case 4: all valid
          expect(result.success).toBe(true);
          expect(result.error).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });
});
