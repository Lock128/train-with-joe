# Tasks: Vocabulary Training

## Task 1: Create Domain Models
- [ ] 1.1 Create `backend/src/model/domain/Training.ts` with `TrainingMode`, `TrainingWord`, `Training`, `TrainingResult`, `MultipleChoiceOption`, and `TrainingExecution` interfaces
- [ ] 1.2 Export all types from the domain model file

## Task 2: Create DynamoDB Table in CDK
- [ ] 2.1 Add `trainingsTable` to `backend/lib/base-stack.ts` with partition key `id`, PAY_PER_REQUEST billing, and DESTROY removal policy
- [ ] 2.2 Add GSI `userId-index` (partition key: `userId`) to the trainings table
- [ ] 2.3 Add GSI `trainingId-index` (partition key: `trainingId`) to the trainings table
- [ ] 2.4 Export `trainingsTable` as a public property of BaseStack
- [ ] 2.5 Add SSM parameter for the trainings table name

## Task 3: Create Training Repository
- [ ] 3.1 Create `backend/src/repositories/training-repository.ts` with singleton pattern matching existing repositories
- [ ] 3.2 Implement `create(training)` method for persisting Training entities
- [ ] 3.3 Implement `getById(id)` method for fetching Training by ID
- [ ] 3.4 Implement `getAllByUserId(userId)` method using `userId-index` GSI
- [ ] 3.5 Implement `update(id, updates)` method with dynamic update expressions
- [ ] 3.6 Implement `delete(id)` method
- [ ] 3.7 Implement `createExecution(execution)` method for persisting TrainingExecution entities
- [ ] 3.8 Implement `getExecutionById(id)` method
- [ ] 3.9 Implement `getExecutionsByTrainingId(trainingId)` method using `trainingId-index` GSI
- [ ] 3.10 Implement `updateExecution(id, updates)` method

## Task 4: Create Training Service
- [ ] 4.1 Create `backend/src/services/training-service.ts` with singleton pattern
- [ ] 4.2 Implement `createTraining(userId, vocabularyListIds, mode, name?)` — fetch vocabulary lists, filter empty ones, validate, create Training with all words
- [ ] 4.3 Implement `updateTraining(trainingId, userId, words)` — validate ownership, validate minimum word count (>0), update word list
- [ ] 4.4 Implement `startTraining(trainingId, userId)` — validate ownership, validate MC word count (>=3), create execution, generate MC options if needed
- [ ] 4.5 Implement `submitAnswer(executionId, userId, wordIndex, answer)` — validate ownership, record result, check completion, update counts
- [ ] 4.6 Implement `getTraining(trainingId, userId)` — fetch training with executions sorted by startedAt descending
- [ ] 4.7 Implement `getTrainings(userId)` — fetch all trainings for user
- [ ] 4.8 Implement `getTrainingStatistics(trainingId, userId)` — compute accuracy, average time, most missed words, per-word stats, accuracy trend
- [ ] 4.9 Implement `getTrainingDayStatistics(userId, date)` — filter executions by date, compute per-execution duration

## Task 5: Extend GraphQL Schema
- [ ] 5.1 Add `TrainingMode` enum and all training-related types to `backend/src/gql-schemas/schema.graphql`
- [ ] 5.2 Add input types: `CreateTrainingInput`, `UpdateTrainingInput`, `TrainingWordInput`, `SubmitAnswerInput`
- [ ] 5.3 Add response types: `TrainingResponse`, `TrainingExecutionResponse`, `SubmitAnswerResponse`, `TrainingStatisticsResponse`, `TrainingDayStatisticsResponse`
- [ ] 5.4 Add mutations: `createTraining`, `updateTraining`, `startTraining`, `submitAnswer`
- [ ] 5.5 Add queries: `getTraining`, `getTrainings`, `getTrainingStatistics`, `getTrainingDayStatistics`

## Task 6: Create Lambda Resolvers
- [ ] 6.1 Create `backend/src/gql-lambda-functions/Mutation.createTraining.ts`
- [ ] 6.2 Create `backend/src/gql-lambda-functions/Mutation.updateTraining.ts`
- [ ] 6.3 Create `backend/src/gql-lambda-functions/Mutation.startTraining.ts`
- [ ] 6.4 Create `backend/src/gql-lambda-functions/Mutation.submitAnswer.ts`
- [ ] 6.5 Create `backend/src/gql-lambda-functions/Query.getTraining.ts`
- [ ] 6.6 Create `backend/src/gql-lambda-functions/Query.getTrainings.ts`
- [ ] 6.7 Create `backend/src/gql-lambda-functions/Query.getTrainingStatistics.ts`
- [ ] 6.8 Create `backend/src/gql-lambda-functions/Query.getTrainingDayStatistics.ts`

## Task 7: Update CDK API Stack
- [ ] 7.1 Add `trainingsTable` prop to `APIStackProps` in `backend/lib/api-stack.ts`
- [ ] 7.2 Create Lambda functions for all 8 training resolvers with appropriate environment variables
- [ ] 7.3 Add Lambda data sources and resolvers for all training mutations and queries
- [ ] 7.4 Grant DynamoDB read/write permissions on trainings table and read permissions on vocabulary lists table to training Lambda functions
- [ ] 7.5 Update `backend/bin/backend.ts` to pass `trainingsTable` from BaseStack to APIStack

## Task 8: Write Backend Property Tests
- [ ] 8.1 Create `backend/test/training-service.property.test.ts` with fast-check setup and shared arbitraries for Training, TrainingWord, TrainingExecution
- [ ] 8.2 [PBT] Property 1: Training creation preserves all input data — *For any* set of non-empty vocabulary lists, creating a training produces a Training with the correct words, mode, userId, and vocabularyListIds
- [ ] 8.3 [PBT] Property 2: Empty vocabulary lists are excluded — *For any* mix of empty and non-empty lists, the created training excludes empty lists
- [ ] 8.4 [PBT] Property 7: Answer correctness matches expected translation — *For any* training word and user answer, the result's correct flag equals whether the answer matches the expected translation
- [ ] 8.5 [PBT] Property 8: Completing all answers finalizes the execution — *For any* execution, after all answers are submitted, correctCount + incorrectCount equals total words
- [ ] 8.6 [PBT] Property 6: Multiple-choice options are valid — *For any* MC training with >=3 words, each word has 3 options with exactly one correct and 2 distractors from the same training
- [ ] 8.7 [PBT] Property 12: Accuracy statistics are correctly computed — *For any* set of completed executions, overall and per-word accuracy percentages are correct
- [ ] 8.8 [PBT] Property 15: Day statistics filter executions by date — *For any* set of executions and a target date, only matching executions are returned

## Task 9: Write Backend Unit Tests
- [ ] 9.1 Create `backend/test/training-service.test.ts` with unit tests for edge cases
- [ ] 9.2 Test creating training with all empty vocabulary lists returns error
- [ ] 9.3 Test removing last word from training returns error
- [ ] 9.4 Test starting MC training with fewer than 3 words returns error
- [ ] 9.5 Test submitting answer for already-completed execution returns error
- [ ] 9.6 Test statistics computation with zero executions

## Task 10: Create Training Provider (Flutter)
- [ ] 10.1 Create `frontend/src/lib/providers/training_provider.dart` with ChangeNotifier extending the existing provider pattern
- [ ] 10.2 Implement `loadTrainings()` method calling `getTrainings` query
- [ ] 10.3 Implement `getTraining(id)` method calling `getTraining` query
- [ ] 10.4 Implement `createTraining(vocabularyListIds, mode, name)` method calling `createTraining` mutation
- [ ] 10.5 Implement `updateTraining(trainingId, words)` method calling `updateTraining` mutation
- [ ] 10.6 Implement `startTraining(trainingId)` method calling `startTraining` mutation
- [ ] 10.7 Implement `submitAnswer(executionId, wordIndex, answer)` method calling `submitAnswer` mutation
- [ ] 10.8 Implement `getTrainingStatistics(trainingId)` method calling `getTrainingStatistics` query
- [ ] 10.9 Implement `getTrainingDayStatistics(date)` method calling `getTrainingDayStatistics` query

## Task 11: Create Training List Screen (Flutter)
- [ ] 11.1 Create `frontend/src/lib/screens/training_list_screen.dart` displaying all user trainings
- [ ] 11.2 Show training name, mode, word count, and execution count per entry
- [ ] 11.3 Navigate to Training Detail screen on tap

## Task 12: Create Training Creation Screen (Flutter)
- [ ] 12.1 Create `frontend/src/lib/screens/training_creation_screen.dart` with vocabulary list selection checkboxes
- [ ] 12.2 Add Training_Mode selector (TEXT_INPUT / MULTIPLE_CHOICE)
- [ ] 12.3 Add "Create" button that calls createTraining and navigates to detail screen; disable when no lists selected
- [ ] 12.4 Display error messages on mutation failure

## Task 13: Create Training Detail Screen (Flutter)
- [ ] 13.1 Create `frontend/src/lib/screens/training_detail_screen.dart` showing training name, mode, and word list
- [ ] 13.2 Add word removal via delete action on each word
- [ ] 13.3 Add word addition from originating vocabulary lists
- [ ] 13.4 Add "Start Training" button navigating to execution screen; disable for MC mode with < 3 words

## Task 14: Create Training Execution Screen (Flutter)
- [ ] 14.1 Create `frontend/src/lib/screens/training_execution_screen.dart` displaying one word at a time
- [ ] 14.2 Implement TEXT_INPUT mode with text input field
- [ ] 14.3 Implement MULTIPLE_CHOICE mode with 3 answer buttons
- [ ] 14.4 Add progress indicator (current word / total)
- [ ] 14.5 Show immediate correct/incorrect feedback after answer submission
- [ ] 14.6 Navigate to Results screen when all words answered

## Task 15: Create Training Results Screen (Flutter)
- [ ] 15.1 Create `frontend/src/lib/screens/training_results_screen.dart` with correct/incorrect counts and total time
- [ ] 15.2 Display per-word breakdown with word, expected answer, user answer, and status
- [ ] 15.3 Add "Retry" button to start new execution and "Back to Training" button

## Task 16: Create Training History Screen (Flutter)
- [ ] 16.1 Create `frontend/src/lib/screens/training_history_screen.dart` listing past executions ordered by date descending
- [ ] 16.2 Show date, duration, and accuracy percentage per execution entry
- [ ] 16.3 Navigate to Results screen on tap
- [ ] 16.4 Display overall statistics: accuracy, average time, most missed words, accuracy trend
- [ ] 16.5 Add Learning Day view for date-specific execution filtering

## Task 17: Update App Navigation
- [ ] 17.1 Register TrainingProvider in `frontend/src/lib/main.dart` MultiProvider
- [ ] 17.2 Add routes for `/trainings`, `/trainings/create`, `/trainings/:id`, `/trainings/:id/execute/:executionId`, `/trainings/:id/results/:executionId`, `/trainings/:id/history`
- [ ] 17.3 Add "My Trainings" button to home screen quick actions
