# Implementation Plan: Randomized Training

## Overview

Extend the existing training system to support a "randomized" mode where words are dynamically selected from attached vocabulary lists each time a training execution starts. Changes span the domain model, training service, GraphQL schema, Lambda resolvers, and Flutter frontend.

## Tasks

- [x] 1. Extend domain model and GraphQL schema
  - [x] 1.1 Add `isRandomized`, `randomizedWordCount`, and `units` optional fields to the `Training` interface in `backend/src/model/domain/Training.ts`
    - Add `isRandomized?: boolean`, `randomizedWordCount?: number`, `units?: string[]` to `Training`
    - Add `words?: TrainingWord[]` to `TrainingExecution`
    - _Requirements: 1.1, 1.2, 2.6, 3.3_

  - [x] 1.2 Update GraphQL schema in `backend/src/gql-schemas/schema.graphql`
    - Add `isRandomized: Boolean` and `randomizedWordCount: Int` to `Training` type
    - Add `isRandomized: Boolean` and `randomizedWordCount: Int` to `CreateTrainingInput`
    - Add `words: [TrainingWord!]` to `TrainingExecution` type
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Implement randomized training creation in TrainingService
  - [x] 2.1 Modify `createTraining` in `backend/src/services/training-service.ts` to accept `isRandomized` and `randomizedWordCount` parameters
    - If `isRandomized` is true: validate `randomizedWordCount` (default 10, cap at 100, reject < 1), store `words: []`, `isRandomized: true`, `randomizedWordCount`, and `units` on the Training entity; skip word fetching
    - If `isRandomized` is false/undefined: existing behavior unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.3_

  - [x] 2.2 Update `Mutation.createTraining.ts` Lambda resolver to pass `isRandomized` and `randomizedWordCount` from input to the service
    - _Requirements: 1.1, 4.3, 4.4_

  - [x] 2.3 Write property test: Randomized training creation stores configuration correctly (Property 1)
    - **Property 1: Randomized training creation stores configuration correctly**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.4 Write property test: Word count validation and capping (Property 2)
    - **Property 2: Word count validation and capping**
    - **Validates: Requirements 1.4, 1.5**

  - [x] 2.5 Write property test: Static training backward compatibility (Property 5)
    - **Property 5: Static training backward compatibility**
    - **Validates: Requirements 3.1, 3.3**

  - [x] 2.6 Write unit tests for randomized creation edge cases
    - Test default `randomizedWordCount` to 10 when not specified (Req 1.3)
    - Test `randomizedWordCount > 100` is capped at 100 (Req 1.4)
    - Test `randomizedWordCount < 1` returns error (Req 1.5)
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement dynamic word selection on startTraining
  - [x] 4.1 Modify `startTraining` in `backend/src/services/training-service.ts` to branch on `training.isRandomized`
    - If randomized: fetch current words from all `training.vocabularyListIds` (skip deleted lists), filter by `training.units` if present, shuffle and select up to `training.randomizedWordCount` words, error if no words available, error if MULTIPLE_CHOICE and < 3 words, store selected words on the `TrainingExecution`, generate multiple choice options from execution words
    - If not randomized: existing behavior unchanged
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 7.1, 7.2_

  - [x] 4.2 Write property test: Dynamic word selection produces a correct subset (Property 3)
    - **Property 3: Dynamic word selection produces a correct subset**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6**

  - [x] 4.3 Write property test: Deleted vocabulary lists are skipped (Property 4)
    - **Property 4: Deleted vocabulary lists are skipped during word selection**
    - **Validates: Requirements 2.4**

  - [x] 4.4 Write property test: Multiple choice options from dynamically selected words (Property 6)
    - **Property 6: Multiple choice options generated from dynamically selected words**
    - **Validates: Requirements 7.1**

  - [x] 4.5 Write unit tests for startTraining edge cases
    - Test all attached lists deleted returns error (Req 2.5)
    - Test MULTIPLE_CHOICE with < 3 available words returns error (Req 7.2)
    - Test static training start still uses `training.words` (Req 3.2)
    - _Requirements: 2.5, 3.2, 7.2_

- [x] 5. Implement dual-path submitAnswer
  - [x] 5.1 Modify `submitAnswer` in `backend/src/services/training-service.ts` to resolve words from `execution.words` when training is randomized, or from `training.words` when static
    - Check `training.isRandomized`; if true, use `execution.words[wordIndex]`; if false, use `training.words[wordIndex]` (existing behavior)
    - Completion check: compare `execution.results.length` against the appropriate word list length
    - _Requirements: 2.6, 3.2_

  - [x] 5.2 Write unit tests for submitAnswer dual-path
    - Test randomized execution resolves words from `execution.words`
    - Test static execution resolves words from `training.words`
    - _Requirements: 2.6, 3.2_

- [x] 6. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update frontend training provider and GraphQL queries
  - [x] 7.1 Update `createTraining` in `frontend/src/lib/providers/training_provider.dart` to accept optional `isRandomized` and `randomizedWordCount` parameters and include them in the mutation input
    - _Requirements: 5.3, 5.4_

  - [x] 7.2 Update `loadTrainings` and `getTraining` GraphQL queries in `training_provider.dart` to fetch `isRandomized` and `randomizedWordCount` fields
    - _Requirements: 6.1, 6.2_

  - [x] 7.3 Update `startTraining` GraphQL mutation in `training_provider.dart` to fetch `execution.words` field in the response
    - _Requirements: 2.6, 4.5_

- [x] 8. Update frontend training creation UI
  - [x] 8.1 Add a toggle for randomized mode on the training creation screen
    - When enabled, show a numeric input for word count
    - When disabled, omit `isRandomized` and `randomizedWordCount` from the mutation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Update frontend training list and detail views
  - [x] 9.1 Show a visual indicator (e.g., shuffle icon) for randomized trainings in the training list
    - _Requirements: 6.1_

  - [x] 9.2 Update training detail view to show randomized word count and vocabulary list count instead of a fixed word list for randomized trainings
    - _Requirements: 6.2, 6.3_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- No new DynamoDB tables or CDK stack changes are required
