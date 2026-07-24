import 'package:flutter/foundation.dart';
import '../../domain/models/training.dart';
import '../../domain/models/training_execution.dart';
import '../../domain/models/training_statistics.dart';
import '../../domain/result.dart';
import '../../services/api_service.dart';

/// Repository for training data operations.
/// Encapsulates all GraphQL queries/mutations related to trainings.
class TrainingRepository {
  final ApiService _apiService;

  TrainingRepository({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  /// Load all trainings for the current user.
  Future<Result<List<Training>>> getTrainings() async {
    try {
      const query = '''
        query GetTrainings {
          getTrainings {
            id userId name mode direction vocabularyListIds createdAt updatedAt
            isRandomized randomizedWordCount multipleChoiceOptionCount
            sourceLanguage targetLanguage
            words { word vocabularyListId unit }
            executions { id }
          }
        }
      ''';

      final response = await _apiService.query(query);
      final list = response['getTrainings'] as List<dynamic>?;
      final trainings = list
              ?.map((item) =>
                  Training.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [];
      return Result.success(trainings);
    } catch (e) {
      debugPrint('Error loading trainings: $e');
      return Result.failure(e.toString());
    }
  }

  /// Get a single training by ID.
  Future<Result<Training>> getTraining(String id) async {
    try {
      const query = '''
        query GetTraining(\$trainingId: ID!) {
          getTraining(trainingId: \$trainingId) {
            success
            training {
              id userId name mode direction vocabularyListIds createdAt updatedAt
              isRandomized randomizedWordCount multipleChoiceOptionCount
              sourceLanguage targetLanguage
              words { word translation vocabularyListId unit }
              executions {
                id trainingId userId startedAt completedAt correctCount incorrectCount
              }
            }
            error
          }
        }
      ''';

      final response =
          await _apiService.query(query, variables: {'trainingId': id});
      final result = response['getTraining'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final trainingData = result['training'] as Map<String, dynamic>?;
        if (trainingData != null) {
          return Result.success(Training.fromJson(trainingData));
        }
      }
      final errorMsg =
          result?['error'] as String? ?? 'Failed to get training';
      return Result.failure(errorMsg);
    } catch (e) {
      debugPrint('Error getting training: $e');
      return Result.failure(e.toString());
    }
  }

  /// Create a new training.
  Future<Result<Training>> createTraining({
    required List<String> vocabularyListIds,
    required String mode,
    String? name,
    int? wordCount,
    String? direction,
    bool? isRandomized,
    int? randomizedWordCount,
    int? multipleChoiceOptionCount,
    String? sourceLanguage,
    String? targetLanguage,
  }) async {
    try {
      const mutation = '''
        mutation CreateTraining(\$input: CreateTrainingInput!) {
          createTraining(input: \$input) {
            success
            training {
              id userId name mode direction vocabularyListIds createdAt updatedAt
              isRandomized randomizedWordCount multipleChoiceOptionCount
              sourceLanguage targetLanguage
              words { word translation vocabularyListId unit }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'vocabularyListIds': vocabularyListIds,
            'mode': mode,
            if (name != null) 'name': name,
            if (wordCount != null) 'wordCount': wordCount,
            if (direction != null) 'direction': direction,
            if (isRandomized != null && isRandomized) 'isRandomized': isRandomized,
            if (isRandomized != null && isRandomized && randomizedWordCount != null)
              'randomizedWordCount': randomizedWordCount,
            if (multipleChoiceOptionCount != null)
              'multipleChoiceOptionCount': multipleChoiceOptionCount,
            if (sourceLanguage != null) 'sourceLanguage': sourceLanguage,
            if (targetLanguage != null) 'targetLanguage': targetLanguage,
          },
        },
      );

      final result = response['createTraining'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final trainingData = result['training'] as Map<String, dynamic>?;
        if (trainingData != null) {
          return Result.success(Training.fromJson(trainingData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to create training',
      );
    } catch (e) {
      debugPrint('Error creating training: $e');
      return Result.failure(e.toString());
    }
  }

  /// Update training words and/or name.
  Future<Result<Training>> updateTraining(
    String id, {
    List<Map<String, dynamic>>? words,
    String? name,
  }) async {
    try {
      const mutation = '''
        mutation UpdateTraining(\$input: UpdateTrainingInput!) {
          updateTraining(input: \$input) {
            success
            training {
              id userId name mode direction vocabularyListIds createdAt updatedAt
              words { word translation vocabularyListId unit }
            }
            error
          }
        }
      ''';

      final input = <String, dynamic>{'trainingId': id};
      if (words != null) input['words'] = words;
      if (name != null) input['name'] = name;

      final response = await _apiService.mutate(
        mutation,
        variables: {'input': input},
      );

      final result = response['updateTraining'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final trainingData = result['training'] as Map<String, dynamic>?;
        if (trainingData != null) {
          return Result.success(Training.fromJson(trainingData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to update training',
      );
    } catch (e) {
      debugPrint('Error updating training: $e');
      return Result.failure(e.toString());
    }
  }

  /// Delete a training by ID.
  Future<Result<void>> deleteTraining(String id) async {
    try {
      const mutation = '''
        mutation DeleteTraining(\$trainingId: ID!) {
          deleteTraining(trainingId: \$trainingId) {
            success
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {'trainingId': id},
      );

      final result = response['deleteTraining'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        return const Result.success(null);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to delete training',
      );
    } catch (e) {
      debugPrint('Error deleting training: $e');
      return Result.failure(e.toString());
    }
  }

  /// Start a training execution.
  Future<Result<TrainingExecution>> startTraining(String trainingId) async {
    try {
      const mutation = '''
        mutation StartTraining(\$trainingId: ID!) {
          startTraining(trainingId: \$trainingId) {
            success
            execution {
              id trainingId userId startedAt completedAt correctCount incorrectCount
              results { wordIndex word expectedAnswer userAnswer correct }
              multipleChoiceOptions { wordIndex options }
              promptWords { word vocabularyListId unit }
              aiExercises { prompt options exerciseType sourceWord }
              verbConjugationExercises { infinitive prompt exerciseType hint }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {'trainingId': trainingId},
      );

      final result = response['startTraining'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final execData = result['execution'] as Map<String, dynamic>?;
        if (execData != null) {
          return Result.success(TrainingExecution.fromJson(execData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to start training',
      );
    } catch (e) {
      debugPrint('Error starting training: $e');
      return Result.failure(e.toString());
    }
  }

  /// Submit an answer for a training execution.
  /// Returns the full submit result including the updated execution.
  Future<Result<SubmitAnswerResponse>> submitAnswer(
    String executionId,
    int wordIndex,
    String answer,
  ) async {
    try {
      const mutation = '''
        mutation SubmitAnswer(\$input: SubmitAnswerInput!) {
          submitAnswer(input: \$input) {
            success
            result { wordIndex word expectedAnswer userAnswer correct }
            completed
            execution {
              id trainingId userId startedAt completedAt correctCount incorrectCount
              results { wordIndex word expectedAnswer userAnswer correct }
              multipleChoiceOptions { wordIndex options }
              aiExercises { prompt options exerciseType sourceWord }
              verbConjugationExercises { infinitive prompt exerciseType hint }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'executionId': executionId,
            'wordIndex': wordIndex,
            'answer': answer,
          },
        },
      );

      final result = response['submitAnswer'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final answerResult = result['result'] as Map<String, dynamic>?;
        final execData = result['execution'] as Map<String, dynamic>?;
        return Result.success(SubmitAnswerResponse(
          result: answerResult != null ? AnswerResult.fromJson(answerResult) : null,
          completed: result['completed'] as bool? ?? false,
          execution: execData != null ? TrainingExecution.fromJson(execData) : null,
        ));
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to submit answer',
      );
    } catch (e) {
      debugPrint('Error submitting answer: $e');
      return Result.failure(e.toString());
    }
  }

  /// Get training statistics.
  Future<Result<TrainingStatistics>> getTrainingStatistics(
    String trainingId,
  ) async {
    try {
      const query = '''
        query GetTrainingStatistics(\$trainingId: ID!) {
          getTrainingStatistics(trainingId: \$trainingId) {
            success
            statistics {
              overallAccuracy averageTimeSeconds totalExecutions
              perWordStatistics { word translation correctCount totalCount accuracyPercentage }
              mostMissedWords { word translation correctCount totalCount accuracyPercentage }
              accuracyTrend { executionId startedAt accuracy }
            }
            error
          }
        }
      ''';

      final response =
          await _apiService.query(query, variables: {'trainingId': trainingId});
      final result =
          response['getTrainingStatistics'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final statsData = result['statistics'] as Map<String, dynamic>?;
        if (statsData != null) {
          return Result.success(TrainingStatistics.fromJson(statsData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to get training statistics',
      );
    } catch (e) {
      debugPrint('Error getting training statistics: $e');
      return Result.failure(e.toString());
    }
  }

  /// Get training day statistics for a specific date.
  Future<Result<DayStatistics>> getTrainingDayStatistics(
    String date, {
    String? userId,
  }) async {
    try {
      const query = '''
        query GetTrainingDayStatistics(\$date: String!, \$userId: ID) {
          getTrainingDayStatistics(date: \$date, userId: \$userId) {
            success
            dayStatistics {
              date totalExecutions totalCorrect totalIncorrect
              executions {
                executionId trainingId trainingName startedAt completedAt
                correctCount incorrectCount durationSeconds
              }
            }
            error
          }
        }
      ''';

      final variables = <String, dynamic>{'date': date};
      if (userId != null) variables['userId'] = userId;

      final response = await _apiService.query(query, variables: variables);
      final result =
          response['getTrainingDayStatistics'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final dayData = result['dayStatistics'] as Map<String, dynamic>?;
        if (dayData != null) {
          return Result.success(DayStatistics.fromJson(dayData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to get day statistics',
      );
    } catch (e) {
      debugPrint('Error getting training day statistics: $e');
      return Result.failure(e.toString());
    }
  }

  /// Get overview statistics across a date range.
  Future<Result<TrainingOverviewStatistics>> getTrainingOverviewStatistics(
    String fromDate,
    String toDate, {
    String? userId,
  }) async {
    try {
      const query = '''
        query GetTrainingOverviewStatistics(\$fromDate: String!, \$toDate: String!, \$userId: ID) {
          getTrainingOverviewStatistics(fromDate: \$fromDate, toDate: \$toDate, userId: \$userId) {
            success
            statistics {
              totalDays totalTrainings totalLearningTimeSeconds
              dailySummaries {
                date trainingCount totalLearningTimeSeconds
              }
            }
            error
          }
        }
      ''';

      final variables = <String, dynamic>{
        'fromDate': fromDate,
        'toDate': toDate,
      };
      if (userId != null) variables['userId'] = userId;

      final response = await _apiService.query(query, variables: variables);
      final result =
          response['getTrainingOverviewStatistics'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final statsData = result['statistics'] as Map<String, dynamic>?;
        if (statsData != null) {
          return Result.success(
              TrainingOverviewStatistics.fromJson(statsData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to get overview statistics',
      );
    } catch (e) {
      debugPrint('Error getting training overview statistics: $e');
      return Result.failure(e.toString());
    }
  }
}

/// Response from submitting an answer.
class SubmitAnswerResponse {
  final AnswerResult? result;
  final bool completed;
  final TrainingExecution? execution;

  const SubmitAnswerResponse({
    this.result,
    this.completed = false,
    this.execution,
  });
}
