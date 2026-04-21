# Implementation Plan: Image Scan & Translate

## Overview

Extends the existing image vocabulary scan pipeline with a two-phase "Scan & Translate" mode. Phase 1 performs OCR text extraction and language detection; Phase 2 translates recognized words into a user-selected target language. Implementation proceeds backend-first (domain models → AI service → Lambda handlers → GraphQL schema → CDK wiring), then frontend (provider → screen), with property-based tests validating correctness properties from the design.

## Tasks

- [ ] 1. Extend domain models and GraphQL schema
  - [x] 1.1 Extend VocabularyListStatus and VocabularyList domain model
    - Add `RECOGNIZED` and `TRANSLATING` to `VocabularyListStatus` type in `backend/src/model/domain/VocabularyList.ts`
    - Add optional `mode?: 'standard' | 'scan_translate'` field to `VocabularyList` interface
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 1.2 Update GraphQL schema with new statuses, input types, and mutation
    - Add `RECOGNIZED` and `TRANSLATING` to `VocabularyListStatus` enum in `backend/src/gql-schemas/schema.graphql`
    - Add `mode: String` field to `AnalyzeImageVocabularyInput`
    - Add `TranslateRecognizedWordsInput` input type with `vocabularyListId: ID!` and `targetLanguage: String!`
    - Add `translateRecognizedWords(input: TranslateRecognizedWordsInput!): VocabularyListResponse` mutation
    - Add `mode: String` field to `VocabularyList` type
    - _Requirements: 6.1, 7.1, 7.4_

- [ ] 2. Implement AIService new methods
  - [x] 2.1 Implement `extractTextFromImage` method in `backend/src/services/ai-service.ts`
    - Add multimodal method using `buildMultimodalRequestBody` with OCR-focused prompt
    - Return `{ title, detectedLanguage, words[] }` structure
    - Follow existing rate limiting, error handling, and JSON repair patterns
    - Instruct Bedrock to return only valid JSON with no markdown fences
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 10.1, 10.3, 10.5_
  - [x] 2.2 Implement `translateWords` method in `backend/src/services/ai-service.ts`
    - Add text-only method using `buildRequestBody` with translation prompt
    - Accept `words[]`, `sourceLanguage`, `targetLanguage`, `userId`
    - Return `VocabularyWord[]` with word, translation, definition, partOfSpeech, exampleSentence, difficulty
    - Follow existing rate limiting, error handling, and JSON repair patterns
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.2, 10.4, 10.5_
  - [x] 2.3 Write unit tests for `extractTextFromImage`
    - Test prompt construction includes image data and OCR instructions
    - Test response parsing for valid JSON
    - Test JSON repair fallback for truncated output
    - Test error handling (empty image, Bedrock failure, rate limit)
    - _Requirements: 1.1, 10.1, 10.5_
  - [x] 2.4 Write unit tests for `translateWords`
    - Test prompt construction includes all words, source and target languages
    - Test response parsing produces valid VocabularyWord array
    - Test handling of untranslatable words (empty translation field)
    - Test error handling (empty words, Bedrock failure, rate limit)
    - _Requirements: 4.1, 4.2, 4.3, 10.2_

- [ ] 3. Extend process-image-vocabulary Lambda with phase support
  - [x] 3.1 Add `phase` parameter and Phase 1 (recognize) logic to `backend/src/gql-lambda-functions/process-image-vocabulary.ts`
    - Extend `ProcessEvent` interface with `phase?: 'recognize' | 'translate'`
    - When `phase === 'recognize'`: call `extractTextFromImage` for each image, deduplicate words, update record to `RECOGNIZED` with `sourceLanguage` and words (no translations)
    - When `phase` is undefined: preserve existing behavior (backward compatible)
    - Map extracted words to `VocabularyWord[]` with only `word` populated and placeholder definition
    - _Requirements: 1.5, 1.6, 2.1, 5.2, 5.3, 5.7, 5.8_
  - [x] 3.2 Add Phase 2 (translate) logic to `process-image-vocabulary.ts`
    - When `phase === 'translate'`: read existing words from DynamoDB, call `translateWords`, update record to `COMPLETED` with enriched words and `targetLanguage`
    - Handle partial translation failures (include untranslatable words with empty translation)
    - _Requirements: 4.1, 4.3, 5.6_
  - [x] 3.3 Write property test: Word deduplication preserves unique entries
    - **Property 1: Word deduplication preserves unique entries**
    - Generate random string arrays with duplicates, verify deduplication output contains exactly the unique set
    - **Validates: Requirements 1.5**
  - [x] 3.4 Write property test: Batch processing resilience
    - **Property 2: Batch processing resilience**
    - Generate random image batch results (success/failure patterns), verify status and word aggregation logic
    - **Validates: Requirements 1.6, 5.7, 5.8**
  - [x] 3.5 Write property test: Phase 1 recognition produces untranslated word list
    - **Property 3: Phase 1 recognition produces untranslated word list**
    - Generate random extraction results, verify RECOGNIZED state invariants (status, sourceLanguage set, translations empty)
    - **Validates: Requirements 5.3**
  - [x] 3.6 Write property test: Phase 2 translation produces enriched vocabulary
    - **Property 4: Phase 2 translation produces enriched vocabulary**
    - Generate random word lists + target languages, verify COMPLETED state invariants (all fields populated)
    - **Validates: Requirements 5.6**

- [x] 4. Checkpoint - Ensure all backend logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement translateRecognizedWords mutation Lambda
  - [x] 5.1 Create `backend/src/gql-lambda-functions/Mutation.translateRecognizedWords.ts`
    - Validate vocabulary list exists and belongs to authenticated user
    - Validate status is `RECOGNIZED`; return appropriate error messages for invalid states
    - Set status to `TRANSLATING`, async-invoke `process-image-vocabulary` with `phase: 'translate'`
    - Return updated vocabulary list
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 5.2 Update `Mutation.analyzeImageVocabulary.ts` to support `mode: 'scan_translate'`
    - Accept `mode` field from input
    - When `mode === 'scan_translate'`: pass `phase: 'recognize'` and `mode` to the processor Lambda invocation
    - Store `mode` on the PENDING vocabulary list record
    - Preserve existing behavior when `mode` is omitted
    - _Requirements: 5.1, 5.2, 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 5.3 Write property test: translateRecognizedWords validation
    - **Property 6: translateRecognizedWords validation**
    - Generate random (listId, userId, status) combinations, verify mutation accepts only when list exists, belongs to user, and has status RECOGNIZED
    - **Validates: Requirements 6.2, 6.3, 6.4, 7.3**
  - [x] 5.4 Write unit tests for Mutation.translateRecognizedWords
    - Test successful flow: RECOGNIZED → TRANSLATING with async Lambda invocation
    - Test error: list not found returns "Vocabulary list not found"
    - Test error: list owned by different user returns "Vocabulary list not found"
    - Test error: status not RECOGNIZED returns "Vocabulary list is not ready for translation"
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [x] 5.5 Write unit tests for updated analyzeImageVocabulary with scan_translate mode
    - Test that `mode: 'scan_translate'` passes `phase: 'recognize'` to processor Lambda
    - Test that omitting `mode` preserves existing behavior
    - Test that `mode` is stored on the PENDING record
    - _Requirements: 5.1, 5.2_

- [ ] 6. Wire up CDK infrastructure
  - [x] 6.1 Add translateRecognizedWords Lambda and AppSync resolver to `backend/lib/api-stack.ts`
    - Create `NodejsFunction` for `Mutation.translateRecognizedWords.ts` with same vocabulary Lambda props
    - Grant DynamoDB read/write on vocabularyListsTable, invoke permission on processImageVocabularyFunction
    - Add Lambda data source and resolver for `translateRecognizedWords` mutation
    - Pass `PROCESS_IMAGE_VOCABULARY_FUNCTION_NAME`, `VOCABULARY_LISTS_TABLE_NAME` as env vars
    - _Requirements: 6.1, 6.5_
  - [x] 6.2 Write CDK stack test for new Lambda and resolver
    - Verify the translateRecognizedWords Lambda is created with correct environment variables
    - Verify the AppSync resolver is wired to the correct mutation field
    - _Requirements: 6.1_

- [x] 7. Checkpoint - Ensure all backend tests pass and build succeeds
  - Run `npm run build:appsyncFunctions` to compile resolvers
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement VocabularyProvider extensions (Flutter)
  - [x] 8.1 Add `translateRecognizedWords` method to `frontend/src/lib/providers/vocabulary_provider.dart`
    - Call `translateRecognizedWords` GraphQL mutation with vocabularyListId and targetLanguage
    - Return the updated vocabulary list map
    - _Requirements: 5.5, 6.1_
  - [x] 8.2 Extend `_pollForCompletion` to support target status parameter
    - Add optional `targetStatus` parameter (defaults to existing behavior)
    - When polling for Phase 1, stop at `RECOGNIZED`
    - When polling for Phase 2, stop at `COMPLETED`/`PARTIALLY_COMPLETED`
    - Handle `TRANSLATING` as an in-progress status during Phase 2 polling
    - _Requirements: 5.3, 5.4, 5.6, 7.2, 7.3_
  - [x] 8.3 Add `analyzeScanTranslate` method to VocabularyProvider
    - Upload images, call `analyzeImageVocabulary` with `mode: 'scan_translate'`
    - Poll until `RECOGNIZED` status using extended `_pollForCompletion`
    - Return recognized vocabulary list for word review
    - _Requirements: 5.1, 5.2, 5.3, 8.2, 8.3_

- [ ] 9. Implement ScanTranslateScreen (Flutter)
  - [x] 9.1 Create `frontend/src/lib/screens/scan_translate_screen.dart`
    - Image selection state: reuse `ImagePicker` pattern from `ImageVocabularyScreen` (gallery + camera)
    - Phase 1 polling state: show "Recognizing words..." loading indicator
    - Recognized state: display recognized words list, detected source language, target language dropdown with at least English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Latin
    - Source == target language warning dialog
    - Phase 2 trigger: call `translateRecognizedWords` via provider, show "Translating words..." loading indicator
    - Completed state: display full enriched vocabulary list (word, translation, definition, partOfSpeech, exampleSentence, difficulty)
    - Error and timeout handling with retry option
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [x] 9.2 Add navigation route to ScanTranslateScreen
    - Register route in go_router configuration
    - Add entry point from existing image vocabulary flow (e.g., button on ImageVocabularyScreen)
    - _Requirements: 8.1_

- [ ] 10. Property tests for VocabularyWord constraints and JSON repair
  - [x] 10.1 Write property test: VocabularyWord field constraints
    - **Property 5: VocabularyWord field constraints**
    - Generate random VocabularyWord objects, verify definition ≤ 20 words, exampleSentence ≤ 15 words, partOfSpeech ∈ {noun, verb, adjective, adverb, other}, difficulty ∈ {easy, medium, hard}
    - **Validates: Requirements 4.2**
  - [x] 10.2 Write property test: JSON repair recovers valid subsets from truncated output
    - **Property 7: JSON repair recovers valid subsets from truncated output**
    - Generate valid JSON matching OCR/translation response schemas, truncate at random positions after at least one complete entry, verify `repairTruncatedJson` produces valid JSON or throws
    - **Validates: Requirements 10.5**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 7 correctness properties defined in the design document
- Backend tasks use TypeScript (vitest + fast-check); frontend tasks use Dart (Flutter)
- The existing `process-image-vocabulary` Lambda and `analyzeImageVocabulary` mutation are extended, not replaced — backward compatibility is preserved
- Run `npm run build:appsyncFunctions` after modifying any AppSync resolvers
