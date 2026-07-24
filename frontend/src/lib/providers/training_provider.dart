import 'package:flutter/foundation.dart';
import '../data/repositories/training_repository.dart';
import '../domain/models/training.dart';
import '../domain/models/training_execution.dart';
import '../domain/models/training_statistics.dart';
import '../domain/result.dart';
import '../providers/auth_provider.dart';

/// Provider for managing training state.
///
/// Delegates data fetching to [TrainingRepository] and exposes typed
/// domain models to the UI layer.
class TrainingProvider extends ChangeNotifier {
  final TrainingRepository _repository;

  List<Training> _trainings = [];
  Training? _currentTraining;
  TrainingExecution? _currentExecution;
  TrainingStatistics? _currentStatistics;
  bool _isLoading = false;
  String? _error;
  AuthProvider? _authProvider;

  TrainingProvider({TrainingRepository? repository})
      : _repository = repository ?? TrainingRepository();

  List<Training> get trainings => _trainings;
  Training? get currentTraining => _currentTraining;
  TrainingExecution? get currentExecution => _currentExecution;
  TrainingStatistics? get currentStatistics => _currentStatistics;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Update auth provider reference.
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _trainings.isEmpty) {
      loadTrainings();
    }
  }

  /// Load all trainings for the current user.
  Future<void> loadTrainings() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.getTrainings();
      switch (result) {
        case Success(:final value):
          _trainings = value;
          _error = null;
        case Failure(:final error):
          _error = error;
          _trainings = [];
      }
    } catch (e) {
      debugPrint('Error loading trainings: $e');
      _error = e.toString();
      _trainings = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get a single training by ID.
  Future<Training?> getTraining(String id) async {
    try {
      final result = await _repository.getTraining(id);
      switch (result) {
        case Success(:final value):
          _currentTraining = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          // Remove stale entry if not found
          if (error == 'Training not found') {
            _trainings.removeWhere((t) => t.id == id);
          }
          _error = error;
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

  /// Create a new training.
  Future<Training?> createTraining(
    List<String> vocabListIds,
    String mode,
    String? name, {
    int? wordCount,
    String? direction,
    bool? isRandomized,
    int? randomizedWordCount,
    int? multipleChoiceOptionCount,
    String? sourceLanguage,
    String? targetLanguage,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.createTraining(
        vocabularyListIds: vocabListIds,
        mode: mode,
        name: name,
        wordCount: wordCount,
        direction: direction,
        isRandomized: isRandomized,
        randomizedWordCount: randomizedWordCount,
        multipleChoiceOptionCount: multipleChoiceOptionCount,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      );

      switch (result) {
        case Success(:final value):
          _trainings.add(value);
          _currentTraining = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Update training words and/or name.
  Future<Training?> updateTraining(
    String id, {
    List<Map<String, dynamic>>? words,
    String? name,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.updateTraining(id, words: words, name: name);
      switch (result) {
        case Success(:final value):
          final idx = _trainings.indexWhere((t) => t.id == id);
          if (idx != -1) {
            _trainings[idx] = value;
          }
          _currentTraining = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Delete a training by ID.
  Future<bool> deleteTraining(String id) async {
    try {
      final result = await _repository.deleteTraining(id);
      switch (result) {
        case Success():
          _trainings.removeWhere((t) => t.id == id);
          if (_currentTraining?.id == id) {
            _currentTraining = null;
          }
          notifyListeners();
          return true;
        case Failure(:final error):
          _error = error;
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

  /// Force-remove a stale training from the local list.
  void forceRemoveTraining(String id) {
    _trainings.removeWhere((t) => t.id == id);
    if (_currentTraining?.id == id) {
      _currentTraining = null;
    }
    notifyListeners();
    // Best-effort backend cleanup
    deleteTraining(id).catchError((_) => false);
  }

  /// Start a training execution.
  Future<TrainingExecution?> startTraining(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.startTraining(id);
      switch (result) {
        case Success(:final value):
          _currentExecution = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Submit an answer for a training execution.
  Future<SubmitAnswerResponse?> submitAnswer(
    String executionId,
    int wordIndex,
    String answer,
  ) async {
    try {
      final result = await _repository.submitAnswer(executionId, wordIndex, answer);
      switch (result) {
        case Success(:final value):
          _currentExecution = value.execution;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Get training statistics.
  Future<TrainingStatistics?> getTrainingStatistics(String id) async {
    try {
      final result = await _repository.getTrainingStatistics(id);
      switch (result) {
        case Success(:final value):
          _currentStatistics = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Get training day statistics for a specific date.
  Future<DayStatistics?> getTrainingDayStatistics(String date) async {
    try {
      final result = await _repository.getTrainingDayStatistics(date);
      switch (result) {
        case Success(:final value):
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Get overview statistics across a date range.
  Future<TrainingOverviewStatistics?> getTrainingOverviewStatistics(
    String fromDate,
    String toDate,
  ) async {
    try {
      final result = await _repository.getTrainingOverviewStatistics(fromDate, toDate);
      switch (result) {
        case Success(:final value):
          return value;
        case Failure(:final error):
          _error = error;
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

  /// Clear training data (on sign out).
  void clear() {
    _trainings = [];
    _currentTraining = null;
    _currentExecution = null;
    _currentStatistics = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }

  // ── Admin methods ──

  /// Get overview statistics for a specific user (admin only).
  Future<TrainingOverviewStatistics?> getTrainingOverviewStatisticsForUser(
    String fromDate,
    String toDate,
    String userId,
  ) async {
    try {
      final result = await _repository.getTrainingOverviewStatistics(
        fromDate,
        toDate,
        userId: userId,
      );
      switch (result) {
        case Success(:final value):
          return value;
        case Failure(:final error):
          _error = error;
          notifyListeners();
          return null;
      }
    } catch (e) {
      debugPrint('Error getting training overview statistics for user: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Get day statistics for a specific user (admin only).
  Future<DayStatistics?> getTrainingDayStatisticsForUser(
    String date,
    String userId,
  ) async {
    try {
      final result = await _repository.getTrainingDayStatistics(date, userId: userId);
      switch (result) {
        case Success(:final value):
          return value;
        case Failure(:final error):
          _error = error;
          notifyListeners();
          return null;
      }
    } catch (e) {
      debugPrint('Error getting training day statistics for user: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }
}
