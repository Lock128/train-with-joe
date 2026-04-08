# Implementation Plan: AI Training Mode

## Overview

Extend the existing training system with an AI-powered training mode (`AI_TRAINING`) that uses Amazon Bedrock to generate contextual language exercises (fill-in-the-blank, verb conjugation, preposition selection, sentence completion) from selected vocabulary words. Changes span the domain model, AI service, training service, GraphQL schema, and Flutter frontend.

## Tasks

- [x] 1. Extend domain model and GraphQL schema
  - [x] 1.1 Add `AI_TRAINING` to `TrainingMode` type and add `AIExercise` interface in `backend/src/model/domain/Training.ts`
    - Extend `TrainingMode` to `'TEXT_INPUT' | 'MULTIPLE_CHOICE' | 'AI_TRAINING'`
    - Add `AIExercise` interface with `prompt`, `options`, `correctOptionIndex`, `exerciseType`, `sourceWord`
    - Add optional `aiExercises?: AIExercise[]` field to `TrainingExecution`
    - _Requirements: 1.2, 3.3, 3.4_

  - [x] 1.2 Update GraphQL schema in `backend/src/gql-schemas/schema.graphql`
    - Add `AI_TRAINING` to `TrainingMode` enum
    - Add `AIExercise` type with `prompt: String!`, `options: [String!]!`, `correctOptionIndex: Int!`, `exerciseType: String!`, `sourceWord: String!`
    - Add `aiExercises: [AIExercise!]` to `TrainingExecution` type
    - _Requirements: 1.1, 3.1, 3.2, 10.3_

- [x] 2. Implement AI exercise generation in AIService
  - [x] 2.1 Add `generateExercises` method to `backend/src/services/ai-service.ts`
    - Accept `words` array (with word, translation, definition, partOfSpeech, exampleSentence), `sourceLanguage`, `targetLanguage`, `userId`
    - Check rate limit via existing `checkRateLimit`
    - Build structured Bedrock prompt including all word fields and both languages
    - Call Bedrock with `InvokeModelCommand`, parse response as JSON array
    - Validate each exercise: non-empty `prompt`, `options` length 3–5, `correctOptionIndex` in range, non-empty `exerciseType` and `sourceWord`
    - Filter out invalid exercises with logged warnings, throw if zero valid exercises remain
    - Log usage with `logUsage`
    - Return `AIExercise[]`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

  - [x]* 2.2 Write property test: AI exercise prompt construction includes all context (Property 2)
    - **Property 2: AI exercise prompt construction includes all context**
    - **Validates: Requirements 2.2, 2.5**

  - [x]* 2.3 Write property test: AI exercise parsing and validation (Property 3)
    - **Property 3: AI exercise parsing and validation**
    - **Validates: Requirements 2.3, 2.6, 7.1, 7.3**

  - [x]* 2.4 Write property test: AI exercise round-trip serialization (Property 4)
    - **Property 4: AI exercise round-trip serialization**
    - **Validates: Requirements 7.5**


  - [x]* 2.5 Write unit tests for AI exercise generation edge cases
    - Test `generateExercises` returns error when Bedrock fails (Req 2.7)
    - Test `generateExercises` returns rate limit error when limit exceeded (Req 6.1, 6.2)
    - Test `generateExercises` logs usage with userId, operation, tokenCount (Req 6.3)
    - Test Bedrock response with invalid JSON returns parsing error (Req 7.2)
    - Test all exercises invalid returns error (Req 7.4)
    - _Requirements: 2.7, 6.1, 6.2, 6.3, 7.2, 7.4_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement AI training creation and start in TrainingService
  - [x] 4.1 Modify `createTraining` in `backend/src/services/training-service.ts` to accept `AI_TRAINING` mode
    - For static AI trainings: word selection works identically to existing modes (fetch from vocab lists, shuffle, slice)
    - For randomized AI trainings: store `words: []` as with existing randomized behavior
    - No special handling needed beyond accepting the new mode value
    - _Requirements: 1.3, 5.3_

  - [x] 4.2 Modify `startTraining` in `backend/src/services/training-service.ts` to add AI_TRAINING branch
    - For AI_TRAINING mode: select words (from `training.words` for static, dynamically for randomized)
    - Fetch vocabulary lists to get full word details (definition, partOfSpeech, exampleSentence) and language info (sourceLanguage, targetLanguage)
    - Call `AIService.generateExercises(words, sourceLanguage, targetLanguage, userId)`
    - Store `aiExercises` on the `TrainingExecution`, no `multipleChoiceOptions` for AI trainings
    - Error if fewer than 1 word available
    - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.6, 5.1, 5.2_

  - [x] 4.3 Modify `submitAnswer` in `backend/src/services/training-service.ts` to add AI_TRAINING branch
    - Look up `execution.aiExercises[wordIndex]`
    - Compare `parseInt(answer)` against `exercise.correctOptionIndex`
    - Build `TrainingResult` with prompt as `word`, correct option as `expectedAnswer`
    - Completion check: `results.length === aiExercises.length`
    - _Requirements: 4.4, 4.5_

  - [x]* 4.4 Write property test: AI training creation stores mode correctly (Property 1)
    - **Property 1: AI training creation stores mode correctly**
    - **Validates: Requirements 1.3**

  - [x]* 4.5 Write property test: AI training start produces one exercise per selected word (Property 5)
    - **Property 5: AI training start produces one exercise per selected word**
    - **Validates: Requirements 2.1, 4.1, 4.3**

  - [x]* 4.6 Write property test: AI answer submission and completion (Property 6)
    - **Property 6: AI answer submission and completion**
    - **Validates: Requirements 4.4, 4.5**

  - [x]* 4.7 Write property test: Randomized AI training dynamic selection and generation (Property 7)
    - **Property 7: Randomized AI training dynamic selection and generation**
    - **Validates: Requirements 5.1, 5.2**

  - [x]* 4.8 Write property test: Non-AI trainings backward compatibility (Property 8)
    - **Property 8: Non-AI trainings backward compatibility**
    - **Validates: Requirements 10.1**

  - [x]* 4.9 Write unit tests for AI training service edge cases
    - Test start AI training with 0 available words returns error (Req 4.6)
    - Test existing TEXT_INPUT/MULTIPLE_CHOICE trainings unaffected by AI changes (Req 10.1, 10.2)
    - Test AI answer submission with correct and incorrect option indices (Req 4.4)
    - Test AI training completion after all exercises answered (Req 4.5)
    - _Requirements: 4.4, 4.5, 4.6, 10.1, 10.2_

- [x] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update frontend training provider and creation UI
  - [x] 6.1 Update `startTraining` GraphQL mutation in `frontend/src/lib/providers/training_provider.dart` to fetch `aiExercises { prompt options correctOptionIndex exerciseType sourceWord }` on the execution response
    - _Requirements: 3.2, 9.1_

  - [x] 6.2 Add `AI_TRAINING` as a third `ChoiceChip` option in the mode selector on `frontend/src/lib/screens/training_creation_screen.dart`
    - Allow vocabulary list selection, word count, and randomized mode same as other modes
    - Send mode as `AI_TRAINING` in the `createTraining` mutation
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. Create AI exercise display widget and update execution screen
  - [x] 7.1 Create `frontend/src/lib/widgets/ai_exercise_widget.dart`
    - Display exercise type label (e.g., "Verb Conjugation")
    - Display prompt sentence
    - Display answer options as tappable buttons
    - On selection, submit the option index as the answer via `submitAnswer`
    - Show correct/incorrect feedback with the correct answer highlighted
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 7.2 Update `frontend/src/lib/screens/training_execution_screen.dart` to handle AI_TRAINING mode
    - When mode is AI_TRAINING, render `AIExerciseWidget` instead of text input or multiple choice
    - Show progress indicator (current exercise / total)
    - Navigate to results screen when all exercises completed
    - _Requirements: 9.1, 9.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check with aws-sdk-client-mock
- Unit tests validate specific examples and edge cases
- No new DynamoDB tables, GSIs, or CDK stack changes are required
- Lambda resolvers (`Mutation.createTraining.ts`, `Mutation.startTraining.ts`, `Mutation.submitAnswer.ts`) require no changes — they delegate to TrainingService which handles the AI branch internally
