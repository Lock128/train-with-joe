import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

/// Provider for managing training state
class TrainingProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Map<String, dynamic>> _trainings = [];
  Map<String, dynamic>? _currentTraining;
  Map<String, dynamic>? _currentExecution;
  Map<String, dynamic>? _currentStatistics;
  bool _isLoading = false;
  String? _error;
  AuthProvider? _authProvider;

  List<Map<String, dynamic>> get trainings => _trainings;
  Map<String, dynamic>? get currentTraining => _currentTraining;
  Map<String, dynamic>? get currentExecution => _currentExecution;
  Map<String, dynamic>? get currentStatistics => _currentStatistics;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Update auth provider reference
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _trainings.isEmpty) {
      loadTrainings();
    }
  }

  /// Load all trainings for the current user
  Future<void> loadTrainings() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const query = '''
        query GetTrainings {
          getTrainings {
            id userId name mode direction vocabularyListIds createdAt updatedAt
            words { word translation vocabularyListId }
          }
        }
      ''';

      final response = await _apiService.query(query);
      final list = response['getTrainings'] as List<dynamic>?;
      _trainings = list?.map((item) => item as Map<String, dynamic>).toList() ?? [];
      _error = null;
    } catch (e) {
      debugPrint('Error loading trainings: $e');
      _error = e.toString();
      _trainings = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get a single training by ID
  Future<Map<String, dynamic>?> getTraining(String id) async {
    try {
      const query = '''
        query GetTraining(\$trainingId: ID!) {
          getTraining(trainingId: \$trainingId) {
            success
            training {
              id userId name mode direction vocabularyListIds createdAt updatedAt
              words { word translation vocabularyListId }
              executions {
                id trainingId userId startedAt completedAt correctCount incorrectCount
              }
            }
            error
          }
        }
      ''';

      final response = await _apiService.query(query, variables: {'trainingId': id});
      final result = response['getTraining'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        _currentTraining = result['training'] as Map<String, dynamic>?;
        notifyListeners();
        return _currentTraining;
      } else {
        _error = result?['error'] as String? ?? 'Failed to get training';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error getting training: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Create a new training
  Future<Map<String, dynamic>?> createTraining(
    List<String> vocabListIds,
    String mode,
    String? name, {
    int? wordCount,
    String? direction,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation CreateTraining(\$input: CreateTrainingInput!) {
          createTraining(input: \$input) {
            success
            training {
              id userId name mode direction vocabularyListIds createdAt updatedAt
              words { word translation vocabularyListId }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'vocabularyListIds': vocabListIds,
            'mode': mode,
            if (name != null) 'name': name,
            if (wordCount != null) 'wordCount': wordCount,
            if (direction != null) 'direction': direction,
          },
        },
      );

      final result = response['createTraining'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final training = result['training'] as Map<String, dynamic>?;
        if (training != null) {
          _trainings.add(training);
          _currentTraining = training;
        }
        notifyListeners();
        return training;
      } else {
        _error = result?['error'] as String? ?? 'Failed to create training';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error creating training: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update training words and/or name
  Future<Map<String, dynamic>?> updateTraining(
    String id, {
    List<Map<String, dynamic>>? words,
    String? name,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation UpdateTraining(\$input: UpdateTrainingInput!) {
          updateTraining(input: \$input) {
            success
            training {
              id userId name mode direction vocabularyListIds createdAt updatedAt
              words { word translation vocabularyListId }
            }
            error
          }
        }
      ''';

      final input = <String, dynamic>{
        'trainingId': id,
      };
      if (words != null) input['words'] = words;
      if (name != null) input['name'] = name;

      final response = await _apiService.mutate(
        mutation,
        variables: {'input': input},
      );

      final result = response['updateTraining'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final training = result['training'] as Map<String, dynamic>?;
        if (training != null) {
          final idx = _trainings.indexWhere((t) => t['id'] == id);
          if (idx != -1) {
            _trainings[idx] = training;
          }
          _currentTraining = training;
        }
        notifyListeners();
        return training;
      } else {
        _error = result?['error'] as String? ?? 'Failed to update training';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error updating training: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Delete a training by ID
  Future<bool> deleteTraining(String id) async {
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
        _trainings.removeWhere((t) => t['id'] == id);
        if (_currentTraining?['id'] == id) {
          _currentTraining = null;
        }
        notifyListeners();
        return true;
      } else {
        _error = result?['error'] as String? ?? 'Failed to delete training';
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('Error deleting training: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Start a training execution
  Future<Map<String, dynamic>?> startTraining(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation StartTraining(\$trainingId: ID!) {
          startTraining(trainingId: \$trainingId) {
            success
            execution {
              id trainingId userId startedAt completedAt correctCount incorrectCount
              results { wordIndex word expectedAnswer userAnswer correct }
              multipleChoiceOptions { wordIndex options }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {'trainingId': id},
      );

      final result = response['startTraining'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        _currentExecution = result['execution'] as Map<String, dynamic>?;
        notifyListeners();
        return _currentExecution;
      } else {
        _error = result?['error'] as String? ?? 'Failed to start training';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error starting training: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Submit an answer for a training execution
  Future<Map<String, dynamic>?> submitAnswer(
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
        _currentExecution = result['execution'] as Map<String, dynamic>?;
        notifyListeners();
        return result;
      } else {
        _error = result?['error'] as String? ?? 'Failed to submit answer';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error submitting answer: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Get training statistics
  Future<Map<String, dynamic>?> getTrainingStatistics(String id) async {
    try {
      const query = '''
        query GetTrainingStatistics(\$trainingId: ID!) {
          getTrainingStatistics(trainingId: \$trainingId) {
            success
            statistics {
              overallAccuracy averageTimeSeconds totalExecutions
              perWordStatistics { word translation correctCount incorrectCount accuracyPercentage }
              mostMissedWords { word translation correctCount incorrectCount accuracyPercentage }
              accuracyTrend { executionId startedAt accuracy }
            }
            error
          }
        }
      ''';

      final response = await _apiService.query(query, variables: {'trainingId': id});
      final result = response['getTrainingStatistics'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        _currentStatistics = result['statistics'] as Map<String, dynamic>?;
        notifyListeners();
        return _currentStatistics;
      } else {
        _error = result?['error'] as String? ?? 'Failed to get training statistics';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error getting training statistics: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Get training day statistics for a specific date
  Future<Map<String, dynamic>?> getTrainingDayStatistics(String date) async {
    try {
      const query = '''
        query GetTrainingDayStatistics(\$date: String!) {
          getTrainingDayStatistics(date: \$date) {
            success
            dayStatistics {
              date totalExecutions totalCorrect totalIncorrect overallAccuracy
              executions {
                executionId trainingId trainingName startedAt completedAt
                correctCount incorrectCount durationSeconds
              }
            }
            error
          }
        }
      ''';

      final response = await _apiService.query(query, variables: {'date': date});
      final result = response['getTrainingDayStatistics'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        return result['dayStatistics'] as Map<String, dynamic>?;
      } else {
        _error = result?['error'] as String? ?? 'Failed to get day statistics';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error getting training day statistics: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Get overview statistics across a date range (per-day training count + learning time)
  Future<Map<String, dynamic>?> getTrainingOverviewStatistics(String fromDate, String toDate) async {
    try {
      const query = '''
        query GetTrainingOverviewStatistics(\$fromDate: String!, \$toDate: String!) {
          getTrainingOverviewStatistics(fromDate: \$fromDate, toDate: \$toDate) {
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

      final response = await _apiService.query(
        query,
        variables: {'fromDate': fromDate, 'toDate': toDate},
      );
      final result = response['getTrainingOverviewStatistics'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        return result['statistics'] as Map<String, dynamic>?;
      } else {
        _error = result?['error'] as String? ?? 'Failed to get overview statistics';
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('Error getting training overview statistics: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Clear training data (on sign out)
  void clear() {
    _trainings = [];
    _currentTraining = null;
    _currentExecution = null;
    _currentStatistics = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}
