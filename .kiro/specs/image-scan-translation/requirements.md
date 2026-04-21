# Requirements Document

## Introduction

This feature extends the existing image vocabulary scan functionality with a new "Scan & Translate" mode. Unlike the current flow — which assumes images already contain vocabulary lists with translations (e.g., textbook pages) — this new mode performs OCR-style text recognition on any image (signs, menus, books, labels, etc.), automatically detects the language of the recognized words, lets the user choose a target translation language, and then translates all recognized words into that language. The result is stored as a new vocabulary list that can be used for training.

## Glossary

- **Scan_Translate_System**: The end-to-end feature comprising the frontend screen, GraphQL API, async processing Lambda, and AI service method that performs OCR text extraction, language detection, and translation on arbitrary images.
- **OCR_Extractor**: The AI service component responsible for recognizing and extracting individual words from an image, regardless of the image content type.
- **Language_Detector**: The AI service component responsible for identifying the language of the extracted words.
- **Translation_Engine**: The AI service component responsible for translating extracted words from the detected source language into the user-selected target language, including generating definitions, parts of speech, and example sentences.
- **Recognition_Result**: An intermediate data structure containing the list of recognized words and the detected source language, returned after the OCR and language detection phase.
- **Vocabulary_List**: The existing DynamoDB-backed data model (id, userId, title, words[], sourceLanguage, targetLanguage, status, sourceImageKeys[]) used to persist scan results.
- **Vocabulary_Word**: A single entry within a Vocabulary_List containing word, translation, definition, partOfSpeech, exampleSentence, and difficulty fields.
- **Processing_Lambda**: The asynchronous Lambda function that reads images from S3, invokes the AI service, and updates the Vocabulary_List record in DynamoDB.
- **Bedrock_Model**: The Amazon Bedrock multimodal foundation model (Claude or Nova) used for image analysis, text extraction, and translation.

## Requirements

### Requirement 1: OCR Text Extraction from Arbitrary Images

**User Story:** As a language learner, I want to scan any image containing text (signs, menus, book pages, labels, handwritten notes) so that all visible words are recognized and extracted for vocabulary learning.

#### Acceptance Criteria

1. WHEN the user submits one or more images via the Scan & Translate mode, THE OCR_Extractor SHALL recognize and extract all visible text words from each image.
2. THE OCR_Extractor SHALL support printed text, signage, menus, book pages, labels, and handwritten text in the submitted images.
3. WHEN an image contains no recognizable text, THE OCR_Extractor SHALL return an empty word list for that image.
4. THE OCR_Extractor SHALL preserve the original spelling and casing of each recognized word.
5. THE OCR_Extractor SHALL deduplicate identical words within a single image, retaining only unique entries.
6. IF the Bedrock_Model fails to process an image, THEN THE Scan_Translate_System SHALL mark that image as failed and continue processing remaining images.

### Requirement 2: Automatic Source Language Detection

**User Story:** As a language learner, I want the system to automatically detect the language of the words found in my images so that I do not have to specify it manually.

#### Acceptance Criteria

1. WHEN the OCR_Extractor has extracted words from an image, THE Language_Detector SHALL identify the primary language of the extracted words.
2. THE Language_Detector SHALL return the detected language as a human-readable language name (e.g., "French", "Japanese", "German").
3. WHEN an image contains words in multiple languages, THE Language_Detector SHALL identify the dominant language as the source language.
4. IF the Language_Detector cannot determine the language with confidence, THEN THE Scan_Translate_System SHALL default the source language to "Unknown" and include a warning in the Recognition_Result.

### Requirement 3: Target Language Selection

**User Story:** As a language learner, I want to choose which language the recognized words should be translated into so that I can build vocabulary lists in my native language or any language I am studying.

#### Acceptance Criteria

1. WHEN the user initiates a Scan & Translate operation, THE Scan_Translate_System SHALL present a target language selector before processing begins.
2. THE Scan_Translate_System SHALL offer at least the following target languages: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, and Latin.
3. THE Scan_Translate_System SHALL require the user to select exactly one target language before the translation phase begins.
4. WHEN the detected source language matches the user-selected target language, THE Scan_Translate_System SHALL display a warning to the user and allow the user to proceed or select a different target language.

### Requirement 4: Word Translation and Enrichment

**User Story:** As a language learner, I want each recognized word translated into my chosen target language with definitions, parts of speech, and example sentences so that I get a rich vocabulary list ready for training.

#### Acceptance Criteria

1. WHEN the user has selected a target language, THE Translation_Engine SHALL translate each extracted word from the detected source language into the selected target language.
2. THE Translation_Engine SHALL generate a Vocabulary_Word for each extracted word containing: the original word, translation, a learner-friendly definition (max 20 words), part of speech (noun, verb, adjective, adverb, or other), an example sentence (max 15 words), and a difficulty rating (easy, medium, or hard).
3. IF the Translation_Engine cannot translate a specific word, THEN THE Translation_Engine SHALL include the word in the result with an empty translation field and a definition indicating the word could not be translated.
4. THE Translation_Engine SHALL process all words from all successfully scanned images in a single translation batch per invocation.

### Requirement 5: Two-Phase Async Processing Pipeline

**User Story:** As a developer, I want the scan-and-translate operation to run asynchronously in two phases (extraction then translation) so that the AppSync 30-second timeout is not exceeded and the user can select a target language between phases.

#### Acceptance Criteria

1. WHEN the user submits images for Scan & Translate, THE Scan_Translate_System SHALL create a Vocabulary_List record with status "PENDING" and return the record to the client immediately.
2. THE Processing_Lambda SHALL execute Phase 1 (OCR extraction and language detection) asynchronously after the mutation returns.
3. WHEN Phase 1 completes successfully, THE Processing_Lambda SHALL update the Vocabulary_List record with the extracted words (without translations), the detected source language, and a status of "RECOGNIZED".
4. WHEN the frontend detects a status of "RECOGNIZED", THE Scan_Translate_System SHALL display the recognized words and prompt the user to select a target language.
5. WHEN the user confirms the target language, THE Scan_Translate_System SHALL invoke a second mutation to trigger Phase 2 (translation).
6. THE Processing_Lambda SHALL execute Phase 2 (translation and enrichment) asynchronously and update the Vocabulary_List record with translated words, the target language, and a status of "COMPLETED".
7. IF Phase 1 fails for all images, THEN THE Processing_Lambda SHALL set the Vocabulary_List status to "FAILED" with a descriptive error message.
8. IF Phase 1 succeeds for some images but fails for others, THEN THE Processing_Lambda SHALL set the status to "PARTIALLY_COMPLETED" after Phase 2 finishes and include an error message indicating how many images failed.

### Requirement 6: New GraphQL Mutation for Translation Phase

**User Story:** As a developer, I want a dedicated GraphQL mutation to trigger the translation phase so that the two-phase pipeline is cleanly separated and the target language can be provided after word recognition.

#### Acceptance Criteria

1. THE Scan_Translate_System SHALL expose a new GraphQL mutation `translateRecognizedWords` that accepts a vocabulary list ID and a target language.
2. WHEN `translateRecognizedWords` is called, THE Scan_Translate_System SHALL validate that the vocabulary list exists, belongs to the authenticated user, and has a status of "RECOGNIZED".
3. IF the vocabulary list does not exist or does not belong to the authenticated user, THEN THE Scan_Translate_System SHALL return an error response with message "Vocabulary list not found".
4. IF the vocabulary list status is not "RECOGNIZED", THEN THE Scan_Translate_System SHALL return an error response with message "Vocabulary list is not ready for translation".
5. WHEN validation passes, THE Scan_Translate_System SHALL update the Vocabulary_List status to "TRANSLATING", invoke the Processing_Lambda for Phase 2 asynchronously, and return the updated vocabulary list to the client.

### Requirement 7: New "RECOGNIZED" and "TRANSLATING" Vocabulary List Statuses

**User Story:** As a developer, I want additional vocabulary list statuses to represent the intermediate states of the two-phase pipeline so that the frontend can display appropriate UI for each phase.

#### Acceptance Criteria

1. THE Scan_Translate_System SHALL add "RECOGNIZED" and "TRANSLATING" values to the VocabularyListStatus enum in the GraphQL schema and the domain model.
2. WHILE a Vocabulary_List has status "RECOGNIZED", THE Scan_Translate_System SHALL treat the list as containing recognized but untranslated words.
3. WHILE a Vocabulary_List has status "TRANSLATING", THE Scan_Translate_System SHALL treat the list as actively being translated and prevent duplicate translation requests.
4. THE Scan_Translate_System SHALL ensure existing queries (getVocabularyLists, getVocabularyList) return vocabulary lists in all statuses including "RECOGNIZED" and "TRANSLATING".

### Requirement 8: Frontend Scan & Translate Screen

**User Story:** As a language learner, I want a dedicated screen for the Scan & Translate feature so that I can pick images, see recognized words, choose a translation language, and view the final translated vocabulary list.

#### Acceptance Criteria

1. THE Scan_Translate_System SHALL provide a new screen accessible from the existing image vocabulary flow that is clearly labeled as "Scan & Translate".
2. THE Scan_Translate_System SHALL allow the user to select one or more images from the gallery or capture images using the camera on the Scan & Translate screen.
3. WHILE the Processing_Lambda is executing Phase 1, THE Scan_Translate_System SHALL display a loading indicator with the message "Recognizing words...".
4. WHEN Phase 1 completes and the status is "RECOGNIZED", THE Scan_Translate_System SHALL display the list of recognized words and the detected source language.
5. WHEN the recognized words are displayed, THE Scan_Translate_System SHALL present a target language dropdown and a "Translate" button.
6. WHILE the Processing_Lambda is executing Phase 2, THE Scan_Translate_System SHALL display a loading indicator with the message "Translating words...".
7. WHEN Phase 2 completes and the status is "COMPLETED", THE Scan_Translate_System SHALL display the full translated vocabulary list with word, translation, definition, part of speech, example sentence, and difficulty.

### Requirement 9: Usage Limits and Tier Enforcement

**User Story:** As a product owner, I want the Scan & Translate feature to respect existing usage limits and tier restrictions so that free-tier users are appropriately limited.

#### Acceptance Criteria

1. WHEN a user initiates a Scan & Translate operation, THE Scan_Translate_System SHALL check the image scan limit and vocabulary list limit via the PricingService before creating the PENDING record.
2. IF the user has exceeded the image scan limit, THEN THE Scan_Translate_System SHALL return an error with errorCode "UPGRADE_REQUIRED".
3. IF the user has exceeded the vocabulary list limit, THEN THE Scan_Translate_System SHALL return an error with errorCode "UPGRADE_REQUIRED".
4. WHEN Phase 1 completes successfully, THE Scan_Translate_System SHALL increment the image scan usage counter by the number of images processed.
5. WHEN the PENDING vocabulary list record is created, THE Scan_Translate_System SHALL increment the vocabulary list usage counter by one.

### Requirement 10: AI Prompt for OCR Extraction and Translation

**User Story:** As a developer, I want dedicated AI prompts for the OCR extraction phase and the translation phase so that each phase produces structured, parseable JSON output from the Bedrock model.

#### Acceptance Criteria

1. THE OCR_Extractor SHALL send a multimodal prompt to the Bedrock_Model that instructs the model to extract all visible text words from the image and return them as a JSON object with fields: title, detectedLanguage, and words (array of strings).
2. THE Translation_Engine SHALL send a text prompt to the Bedrock_Model that instructs the model to translate a list of words from a source language to a target language and return a JSON array of Vocabulary_Word objects.
3. THE OCR_Extractor SHALL instruct the Bedrock_Model to return only valid JSON with no markdown fences, no commentary, and no extra text.
4. THE Translation_Engine SHALL instruct the Bedrock_Model to return only valid JSON with no markdown fences, no commentary, and no extra text.
5. IF the Bedrock_Model returns malformed JSON, THEN THE Scan_Translate_System SHALL attempt to repair the JSON using the existing `repairTruncatedJson` method before failing.
