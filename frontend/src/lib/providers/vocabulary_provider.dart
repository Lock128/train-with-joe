import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
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

  /// Get presigned upload URLs from the backend
  Future<List<Map<String, dynamic>>?> _getUploadUrls(int count) async {
    const query = '''
      query GetImageUploadUrls(\$input: GetImageUploadUrlsInput!) {
        getImageUploadUrls(input: \$input) {
          success
          uploads { s3Key uploadUrl }
          error
        }
      }
    ''';

    final response = await _apiService.query(
      query,
      variables: {'input': {'count': count}},
    );

    final result = response['getImageUploadUrls'] as Map<String, dynamic>?;
    if (result?['success'] == true) {
      return (result!['uploads'] as List<dynamic>)
          .map((u) => u as Map<String, dynamic>)
          .toList();
    }
    throw Exception(result?['error'] ?? 'Failed to get upload URLs');
  }

  /// Upload a single image to S3 via presigned URL
  Future<void> _uploadToS3(String uploadUrl, Uint8List imageBytes) async {
    final response = await http.put(
      Uri.parse(uploadUrl),
      headers: {'Content-Type': 'image/jpeg'},
      body: imageBytes,
    );
    if (response.statusCode != 200) {
      throw Exception('S3 upload failed with status ${response.statusCode}');
    }
  }

  /// Upload images to S3 and analyze them for vocabulary words
  Future<Map<String, dynamic>?> analyzeImages(
    List<Uint8List> images, {
    String? language,
  }) async {
    _isAnalyzing = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Get presigned upload URLs
      final uploads = await _getUploadUrls(images.length);
      if (uploads == null || uploads.length != images.length) {
        throw Exception('Failed to get upload URLs');
      }

      // 2. Upload all images to S3 in parallel
      await Future.wait(
        List.generate(images.length, (i) =>
          _uploadToS3(uploads[i]['uploadUrl'] as String, images[i]),
        ),
      );

      // 3. Call the mutation with S3 keys
      final s3Keys = uploads.map((u) => u['s3Key'] as String).toList();

      const mutation = '''
        mutation AnalyzeImageVocabulary(\$input: AnalyzeImageVocabularyInput!) {
          analyzeImageVocabulary(input: \$input) {
            success
            vocabularyList {
              id userId title language createdAt updatedAt
              words { word definition partOfSpeech exampleSentence difficulty }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'imageS3Keys': s3Keys,
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
        _error = result?['error'] as String? ?? 'Failed to analyze images';
        return null;
      }
    } catch (e) {
      debugPrint('Error analyzing images: $e');
      _error = e.toString();
      return null;
    } finally {
      _isAnalyzing = false;
      notifyListeners();
    }
  }

  /// Load all vocabulary lists for the current user
  Future<void> loadVocabularyLists() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const query = '''
        query GetVocabularyLists {
          getVocabularyLists {
            id userId title language createdAt updatedAt
            words { word definition partOfSpeech exampleSentence difficulty }
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
            id userId title language createdAt updatedAt
            words { word definition partOfSpeech exampleSentence difficulty }
          }
        }
      ''';

      final response = await _apiService.query(query, variables: {'id': id});
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
