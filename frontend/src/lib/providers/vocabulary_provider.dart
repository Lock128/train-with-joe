import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

/// Provider for managing vocabulary list state
class VocabularyProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Map<String, dynamic>> _vocabularyLists = [];
  Map<String, dynamic>? _currentList;
  bool _isLoading = false;
  bool _isAnalyzing = false;
  String? _error;
  AuthProvider? _authProvider;

  List<Map<String, dynamic>> get vocabularyLists => _vocabularyLists;
  Map<String, dynamic>? get currentList => _currentList;
  bool get isLoading => _isLoading;
  bool get isAnalyzing => _isAnalyzing;
  String? get error => _error;

  /// Update auth provider reference
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _vocabularyLists.isEmpty) {
      loadVocabularyLists();
    }
  }

  /// Analyze an image for vocabulary words
  Future<Map<String, dynamic>?> analyzeImage(String imageBase64, {String? language}) async {
    _isAnalyzing = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation AnalyzeImageVocabulary(\$input: AnalyzeImageVocabularyInput!) {
          analyzeImageVocabulary(input: \$input) {
            success
            vocabularyList {
              id
              userId
              title
              language
              createdAt
              updatedAt
              words {
                word
                definition
                partOfSpeech
                exampleSentence
                difficulty
              }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'imageBase64': imageBase64,
            if (language != null) 'language': language,
          },
        },
      );

      final result = response['analyzeImageVocabulary'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final vocabularyList = result['vocabularyList'] as Map<String, dynamic>?;
        if (vocabularyList != null) {
          _currentList = vocabularyList;
          _vocabularyLists.add(vocabularyList);
        }
        return vocabularyList;
      } else {
        _error = result?['error'] as String? ?? 'Failed to analyze image';
        return null;
      }
    } catch (e) {
      debugPrint('Error analyzing image: $e');
      _error = e.toString();
      return null;
    } finally {
      _isAnalyzing = false;
      notifyListeners();
    }
  }

  /// Load all vocabulary lists for the current user
  Future<void> loadVocabularyLists() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) {
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const query = '''
        query GetVocabularyLists {
          getVocabularyLists {
            id
            userId
            title
            language
            createdAt
            updatedAt
            words {
              word
              definition
              partOfSpeech
              exampleSentence
              difficulty
            }
          }
        }
      ''';

      final response = await _apiService.query(query);
      final lists = response['getVocabularyLists'] as List<dynamic>?;
      _vocabularyLists = lists?.map((item) => item as Map<String, dynamic>).toList() ?? [];
      _error = null;
    } catch (e) {
      debugPrint('Error loading vocabulary lists: $e');
      _error = e.toString();
      _vocabularyLists = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get a single vocabulary list by ID
  Future<Map<String, dynamic>?> getVocabularyList(String id) async {
    try {
      const query = '''
        query GetVocabularyList(\$id: ID!) {
          getVocabularyList(id: \$id) {
            id
            userId
            title
            language
            createdAt
            updatedAt
            words {
              word
              definition
              partOfSpeech
              exampleSentence
              difficulty
            }
          }
        }
      ''';

      final response = await _apiService.query(
        query,
        variables: {'id': id},
      );

      _currentList = response['getVocabularyList'] as Map<String, dynamic>?;
      notifyListeners();
      return _currentList;
    } catch (e) {
      debugPrint('Error getting vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Clear vocabulary data (on sign out)
  void clear() {
    _vocabularyLists = [];
    _currentList = null;
    _error = null;
    _isLoading = false;
    _isAnalyzing = false;
    notifyListeners();
  }
}
