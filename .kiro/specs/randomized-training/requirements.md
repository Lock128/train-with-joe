# Requirements Document

## Introduction

This feature adds a "randomized training" mode to Train with Joe. Currently, words are selected once at training creation time and remain fixed across all executions. With randomized training, the system re-selects a configurable number of words from the attached vocabulary lists each time the user starts a training execution. This gives users fresh practice sessions from the same pool of vocabulary without needing to recreate trainings.

## Glossary

- **Training**: A reusable vocabulary practice session with a name, mode, direction, and associated vocabulary lists
- **Training_Execution**: A single run of a Training, tracking answers, scores, and timing
- **Vocabulary_List**: A user-owned collection of vocabulary words with translations
- **Randomized_Training**: A Training where words are dynamically selected from attached vocabulary lists each time a Training_Execution is started
- **Static_Training**: A Training where words are fixed at creation time (current behavior)
- **Randomized_Word_Count**: The number of words to randomly select from the attached vocabulary lists per Training_Execution
- **Training_Service**: The backend service responsible for creating, starting, and managing trainings
- **Frontend_App**: The Flutter mobile application used by the end user

## Requirements

### Requirement 1: Randomized Training Creation

**User Story:** As a user, I want to create a training that randomly picks words from my vocabulary lists each time I start it, so that I get varied practice sessions without recreating trainings.

#### Acceptance Criteria

1. WHEN a user creates a training with the isRandomized flag set to true, THE Training_Service SHALL store the Training with the isRandomized flag set to true and the specified Randomized_Word_Count
2. WHEN a user creates a Randomized_Training, THE Training_Service SHALL store the vocabularyListIds on the Training without pre-selecting words into the words array
3. WHEN a user creates a Randomized_Training without specifying a Randomized_Word_Count, THE Training_Service SHALL default the Randomized_Word_Count to 10
4. WHEN a user creates a Randomized_Training with a Randomized_Word_Count greater than 100, THE Training_Service SHALL cap the Randomized_Word_Count at 100
5. WHEN a user creates a Randomized_Training with a Randomized_Word_Count less than 1, THE Training_Service SHALL reject the request with a descriptive error message

### Requirement 2: Dynamic Word Selection on Start

**User Story:** As a user, I want a fresh random selection of words every time I start a randomized training, so that each session challenges me with different vocabulary.

#### Acceptance Criteria

1. WHEN a user starts a Randomized_Training, THE Training_Service SHALL fetch the current words from all attached Vocabulary_Lists
2. WHEN a user starts a Randomized_Training, THE Training_Service SHALL randomly select up to the Randomized_Word_Count words from the fetched vocabulary using a uniform random shuffle
3. WHEN a user starts a Randomized_Training and the total available words across all attached Vocabulary_Lists are fewer than the Randomized_Word_Count, THE Training_Service SHALL use all available words for the Training_Execution
4. WHEN a user starts a Randomized_Training and an attached Vocabulary_List has been deleted, THE Training_Service SHALL skip the missing list and select words from the remaining lists
5. IF all attached Vocabulary_Lists have been deleted or contain no words with translations, THEN THE Training_Service SHALL return a descriptive error message and not create a Training_Execution
6. WHEN a user starts a Randomized_Training, THE Training_Service SHALL store the selected words on the Training_Execution so that answer submission can reference them

### Requirement 3: Static Training Backward Compatibility

**User Story:** As a user, I want my existing trainings to continue working exactly as before, so that the new randomized option does not break my current workflow.

#### Acceptance Criteria

1. WHEN a user creates a training without the isRandomized flag, THE Training_Service SHALL create a Static_Training with words pre-selected at creation time (existing behavior)
2. WHEN a user starts a Static_Training, THE Training_Service SHALL use the pre-stored words from the Training entity (existing behavior)
3. THE Training_Service SHALL treat all existing Training entities that lack the isRandomized field as Static_Trainings

### Requirement 4: GraphQL Schema Extension

**User Story:** As a developer, I want the GraphQL schema to support the randomized training fields, so that the frontend can create and display randomized trainings.

#### Acceptance Criteria

1. THE Training type in the GraphQL schema SHALL include an isRandomized Boolean field
2. THE Training type in the GraphQL schema SHALL include a randomizedWordCount Int field
3. THE CreateTrainingInput in the GraphQL schema SHALL accept an optional isRandomized Boolean field
4. THE CreateTrainingInput in the GraphQL schema SHALL accept an optional randomizedWordCount Int field
5. THE TrainingExecution type in the GraphQL schema SHALL include a words field containing the list of TrainingWord items used in that execution

### Requirement 5: Frontend Training Creation for Randomized Mode

**User Story:** As a user, I want to toggle randomized mode and set a word count when creating a training in the app, so that I can configure my randomized training sessions.

#### Acceptance Criteria

1. WHEN a user is creating a training, THE Frontend_App SHALL display a toggle to enable randomized mode
2. WHEN the user enables randomized mode, THE Frontend_App SHALL display a numeric input for the Randomized_Word_Count
3. WHEN the user enables randomized mode, THE Frontend_App SHALL send the isRandomized and randomizedWordCount fields in the createTraining mutation
4. WHEN the user disables randomized mode, THE Frontend_App SHALL omit the isRandomized and randomizedWordCount fields from the createTraining mutation

### Requirement 6: Frontend Display of Randomized Training

**User Story:** As a user, I want to see that a training is randomized in the training list and detail views, so that I can distinguish randomized trainings from static ones.

#### Acceptance Criteria

1. WHEN displaying a Randomized_Training in the training list, THE Frontend_App SHALL show a visual indicator that the training is randomized
2. WHEN displaying a Randomized_Training detail view, THE Frontend_App SHALL show the Randomized_Word_Count and the number of attached Vocabulary_Lists
3. WHEN displaying a Randomized_Training detail view, THE Frontend_App SHALL not display a fixed word list (since words change per execution)

### Requirement 7: Multiple Choice Support for Randomized Training

**User Story:** As a user, I want to use multiple choice mode with randomized trainings, so that I can practice with varied word sets in multiple choice format.

#### Acceptance Criteria

1. WHEN a user starts a Randomized_Training in MULTIPLE_CHOICE mode, THE Training_Service SHALL generate multiple choice options from the dynamically selected words
2. WHEN a user starts a Randomized_Training in MULTIPLE_CHOICE mode and fewer than 3 words are selected, THE Training_Service SHALL return a descriptive error message and not create a Training_Execution
