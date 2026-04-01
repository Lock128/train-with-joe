# Requirements Document

## Introduction

This document defines requirements for the Vocabulary Training feature of the Train with Joe language learning app. The feature allows users to create training sessions from their existing vocabulary lists, practice translations in text-input or multiple-choice mode, customize training content, and review historical results. Training sessions are reusable and track per-execution metrics including timing and correctness.

## Glossary

- **Training**: A reusable test configuration created by a user, composed of selected vocabulary words from one or more Vocabulary_Lists, with a chosen mode
- **Training_Execution**: A single run of a Training, capturing start time, end time, and per-word results
- **Training_Service**: The backend service responsible for creating, updating, starting, and recording Training and Training_Execution data
- **Training_Repository**: The data access layer for persisting Training and Training_Execution entities in DynamoDB
- **Vocabulary_List**: An existing entity containing words with translations, owned by a user
- **Training_Word**: A word entry within a Training, derived from a Vocabulary_List word, containing the word and its expected translation
- **Training_Mode**: The answer format for a Training — either TEXT_INPUT (user types the answer) or MULTIPLE_CHOICE (user picks from 3 options)
- **Training_Result**: The outcome for a single word within a Training_Execution, recording whether the user answered correctly or incorrectly
- **GraphQL_API**: The AWS AppSync-based API used for client-server communication
- **Learning_Day**: A calendar date on which a user performed one or more Training_Executions, used to group and review daily training activity and time frames
- **Flutter_App**: The frontend mobile application built with Flutter, using providers for state management and screens for navigation
- **Training_Provider**: The Flutter provider responsible for managing Training state and communicating with the GraphQL_API

## Requirements

### Requirement 1: Create Training from Vocabulary Lists

**User Story:** As a user, I want to create a training session by selecting one or more of my vocabulary lists, so that I can practice translating words I have previously saved.

#### Acceptance Criteria

1. WHEN a user selects one or more Vocabulary_Lists and a Training_Mode, THE Training_Service SHALL create a Training containing all words from the selected Vocabulary_Lists
2. THE Training SHALL store a reference to the originating Vocabulary_List IDs
3. THE Training SHALL store the selected Training_Mode (TEXT_INPUT or MULTIPLE_CHOICE)
4. THE Training SHALL store the owning user ID
5. IF any selected Vocabulary_List contains zero words, THEN THE Training_Service SHALL exclude that Vocabulary_List from the Training
6. IF all selected Vocabulary_Lists contain zero words, THEN THE Training_Service SHALL return a descriptive error indicating no words are available
7. THE GraphQL_API SHALL define a createTraining mutation accepting a list of Vocabulary_List IDs and a Training_Mode

### Requirement 2: Modify Training Content

**User Story:** As a user, I want to add or remove individual words from a training, so that I can customize which words I practice.

#### Acceptance Criteria

1. WHEN a user removes a Training_Word from a Training, THE Training_Service SHALL remove that word from the Training
2. WHEN a user adds a Training_Word to a Training, THE Training_Service SHALL add that word to the Training
3. IF a removal would result in zero Training_Words, THEN THE Training_Service SHALL reject the removal and return a descriptive error
4. THE GraphQL_API SHALL define an updateTraining mutation accepting a Training ID and updated word list

### Requirement 3: Start and Execute Training

**User Story:** As a user, I want to start a training session and answer translation prompts, so that I can practice my vocabulary knowledge.

#### Acceptance Criteria

1. WHEN a user starts a Training, THE Training_Service SHALL create a new Training_Execution with the current date and time as the start time
2. WHILE a Training_Execution is in progress and the Training_Mode is TEXT_INPUT, THE Training_Service SHALL present each Training_Word and accept a free-text answer from the user
3. WHILE a Training_Execution is in progress and the Training_Mode is MULTIPLE_CHOICE, THE Training_Service SHALL present each Training_Word with 3 answer options, exactly one of which is correct
4. WHEN the user submits an answer for a Training_Word, THE Training_Service SHALL record a Training_Result indicating whether the answer is correct or incorrect
5. WHEN all Training_Words have been answered, THE Training_Service SHALL record the current date and time as the end time of the Training_Execution
6. THE GraphQL_API SHALL define a startTraining mutation accepting a Training ID and returning a new Training_Execution
7. THE GraphQL_API SHALL define a submitAnswer mutation accepting a Training_Execution ID, a word identifier, and the user answer

### Requirement 4: Multiple-Choice Option Generation

**User Story:** As a user, I want multiple-choice options to be plausible, so that the training is meaningful and challenging.

#### Acceptance Criteria

1. WHEN generating multiple-choice options for a Training_Word, THE Training_Service SHALL include the correct translation as one of the 3 options
2. WHEN generating multiple-choice options for a Training_Word, THE Training_Service SHALL select 2 incorrect options from other Training_Words in the same Training
3. IF the Training contains fewer than 3 Training_Words, THEN THE Training_Service SHALL return a descriptive error when starting a MULTIPLE_CHOICE Training_Execution
4. THE Training_Service SHALL randomize the position of the correct answer among the 3 options

### Requirement 5: Track Training Execution Metrics

**User Story:** As a user, I want my training results to be captured, so that I can see how well I performed.

#### Acceptance Criteria

1. THE Training_Execution SHALL store the start date and time
2. THE Training_Execution SHALL store the end date and time
3. THE Training_Execution SHALL store a Training_Result for each Training_Word, including the word, the expected answer, the user answer, and a correct-or-incorrect flag
4. THE Training_Execution SHALL store the total count of correct answers
5. THE Training_Execution SHALL store the total count of incorrect answers
6. THE Training_Execution SHALL be associated with exactly one Training by Training ID

### Requirement 6: Review Past Training Results

**User Story:** As a user, I want to access my past training results, so that I can track my progress over time.

#### Acceptance Criteria

1. WHEN a user requests training results, THE Training_Service SHALL return all Training_Executions for a given Training, ordered by start time descending
2. THE Training_Service SHALL return the full list of Training_Results for each Training_Execution, including per-word correctness
3. THE GraphQL_API SHALL define a getTraining query accepting a Training ID and returning the Training with its Training_Executions
4. THE GraphQL_API SHALL define a getTrainings query returning all Trainings for the authenticated user
5. THE user SHALL be able to see the timings for the training, including the total time used for training

### Requirement 7: Support Multiple Executions per Training

**User Story:** As a user, I want to run the same training multiple times, so that I can practice repeatedly and improve.

#### Acceptance Criteria

1. THE Training_Service SHALL allow creating multiple Training_Executions for the same Training
2. WHEN a new Training_Execution is started, THE Training_Service SHALL preserve all previous Training_Executions for the same Training
3. THE Training_Service SHALL store each Training_Execution independently with its own start time, end time, and Training_Results

### Requirement 8: Training Data Persistence

**User Story:** As a developer, I want training data stored in DynamoDB, so that it integrates with the existing backend infrastructure.

#### Acceptance Criteria

1. THE Training_Repository SHALL persist Training entities in a DynamoDB table
2. THE Training_Repository SHALL persist Training_Execution entities in a DynamoDB table
3. THE Training_Repository SHALL support querying all Trainings by user ID using a Global Secondary Index
4. THE Training_Repository SHALL support querying all Training_Executions by Training ID
5. WHEN a Training_Repository operation fails, THE Training_Repository SHALL return descriptive error information
6. THE Training_Repository SHALL follow the singleton pattern consistent with existing repositories in the codebase

### Requirement 9: Training Statistics

**User Story:** As a user, I want to see statistics about my training, so that I can understand my overall performance and identify areas for improvement.

#### Acceptance Criteria

1. THE Training_Service SHALL compute the overall accuracy percentage across all Training_Executions for a given Training
2. THE Training_Service SHALL compute the average time spent per Training_Execution for a given Training
3. THE Training_Service SHALL identify the Training_Words the user most frequently answers incorrectly across all Training_Executions
4. THE Training_Service SHALL compute the accuracy trend over time, showing whether the user is improving across successive Training_Executions
5. THE Training_Service SHALL compute per-word accuracy statistics, showing the percentage of correct answers for each Training_Word across all Training_Executions
6. THE GraphQL_API SHALL define a getTrainingStatistics query accepting a Training ID and returning the computed statistics
7. WHEN a user requests statistics for a specific date, THE Training_Service SHALL return all Training_Executions that started on that date, including each execution's start time, end time, and total duration
8. THE GraphQL_API SHALL define a getTrainingDayStatistics query accepting a user ID and a date, returning all Training_Executions for that day grouped by Training, with time frames for each execution

### Requirement 10: Training Creation Screen

**User Story:** As a user, I want a screen where I can create a new training by selecting vocabulary lists and a mode, so that I can set up my practice session.

#### Acceptance Criteria

1. THE Flutter app SHALL provide a Create Training screen accessible from the home screen or a training list screen
2. THE Create Training screen SHALL display all Vocabulary_Lists owned by the user with checkboxes for selection
3. THE Create Training screen SHALL allow the user to select a Training_Mode (TEXT_INPUT or MULTIPLE_CHOICE)
4. THE Create Training screen SHALL display a "Create" button that calls the createTraining mutation and navigates to the Training detail screen on success
5. IF no Vocabulary_Lists are selected, THEN THE Create Training screen SHALL disable the "Create" button
6. THE Create Training screen SHALL display an error message if the createTraining mutation fails

### Requirement 11: Training Detail and Word Management Screen

**User Story:** As a user, I want a screen where I can view and modify the words in my training before starting it, so that I can customize my practice.

#### Acceptance Criteria

1. THE Flutter app SHALL provide a Training Detail screen showing the Training name, mode, and list of Training_Words
2. THE Training Detail screen SHALL allow the user to remove individual Training_Words via a delete action on each word
3. THE Training Detail screen SHALL allow the user to add words from the originating Vocabulary_Lists that are not already in the Training
4. THE Training Detail screen SHALL display a "Start Training" button that navigates to the Training Execution screen
5. IF the Training contains fewer than 3 words and the mode is MULTIPLE_CHOICE, THEN THE Training Detail screen SHALL disable the "Start Training" button and display an explanatory message

### Requirement 12: Training Execution Screen

**User Story:** As a user, I want a screen that presents vocabulary prompts and captures my answers, so that I can complete a training session.

#### Acceptance Criteria

1. THE Flutter app SHALL provide a Training Execution screen that displays one Training_Word at a time
2. WHEN the Training_Mode is TEXT_INPUT, THE Training Execution screen SHALL display a text input field for the user to type the translation
3. WHEN the Training_Mode is MULTIPLE_CHOICE, THE Training Execution screen SHALL display 3 answer buttons, exactly one of which is correct
4. THE Training Execution screen SHALL display a progress indicator showing the current word number out of the total
5. WHEN the user submits an answer, THE Training Execution screen SHALL provide immediate visual feedback indicating whether the answer was correct or incorrect
6. WHEN all words have been answered, THE Training Execution screen SHALL navigate to a Results Summary screen

### Requirement 13: Training Results Screen

**User Story:** As a user, I want a results screen after completing a training, so that I can immediately see how I performed.

#### Acceptance Criteria

1. THE Flutter app SHALL provide a Results Summary screen displayed after a Training_Execution completes
2. THE Results Summary screen SHALL display the total correct and incorrect answer counts
3. THE Results Summary screen SHALL display the total time spent on the Training_Execution
4. THE Results Summary screen SHALL display a per-word breakdown showing the word, expected answer, user answer, and correct-or-incorrect status
5. THE Results Summary screen SHALL provide a "Retry" button to start a new Training_Execution for the same Training
6. THE Results Summary screen SHALL provide a "Back to Training" button to return to the Training Detail screen

### Requirement 14: Training List Screen

**User Story:** As a user, I want a screen listing all my trainings, so that I can select one to practice or review.

#### Acceptance Criteria

1. THE Flutter app SHALL provide a Training List screen accessible from the home screen
2. THE Training List screen SHALL display all Trainings owned by the authenticated user
3. EACH Training entry SHALL display the training name, mode, word count, and number of past executions
4. WHEN the user taps a Training entry, THE app SHALL navigate to the Training Detail screen

### Requirement 15: Training History and Statistics Screen

**User Story:** As a user, I want a screen where I can review my past training results and statistics, so that I can track my progress.

#### Acceptance Criteria

1. THE Flutter app SHALL provide a Training History screen accessible from the Training Detail screen
2. THE Training History screen SHALL list all past Training_Executions for the selected Training, ordered by date descending
3. EACH Training_Execution entry SHALL display the date, duration, and accuracy percentage
4. WHEN the user taps a Training_Execution entry, THE app SHALL navigate to the Results Summary screen for that execution
5. THE Training History screen SHALL display overall statistics including accuracy percentage, average time, most missed words, and accuracy trend
6. THE Flutter app SHALL provide a Learning Day view that shows all Training_Executions for a selected date with their time frames

