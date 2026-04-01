import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:amplify_flutter/amplify_flutter.dart' hide AuthProvider;
import 'package:share_plus/share_plus.dart';
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
    String? sourceLanguage,
    String? targetLanguage,
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
              id userId title sourceLanguage targetLanguage status errorMessage createdAt updatedAt
              words { word translation definition partOfSpeech exampleSentence difficulty }
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
            if (sourceLanguage != null) 'sourceLanguage': sourceLanguage,
            if (targetLanguage != null) 'targetLanguage': targetLanguage,
          },
        },
      );

      final result = response['analyzeImageVocabulary'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final vocabularyList = result['vocabularyList'] as Map<String, dynamic>?;
        if (vocabularyList != null) {
          // Poll until the async processing completes
          final completed = await _pollForCompletion(vocabularyList['id'] as String);
          if (completed != null) {
            _currentList = completed;
            _vocabularyLists.add(completed);
            return completed;
          } else if (_error == null) {
            // Polling timed out but no error — still processing in the background
            _error = 'Processing is running in the background. Please check your vocabulary lists in a few minutes.';
            _vocabularyLists.add(vocabularyList);
            notifyListeners();
            return null;
          } else {
            // Actual failure (e.g. status == FAILED)
            _vocabularyLists.add(vocabularyList);
            return null;
          }
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
            id userId title sourceLanguage targetLanguage status errorMessage createdAt updatedAt
            words { word translation definition partOfSpeech exampleSentence difficulty }
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
            id userId title sourceLanguage targetLanguage status errorMessage createdAt updatedAt
            words { word translation definition partOfSpeech exampleSentence difficulty }
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

  /// Poll getVocabularyList until status is COMPLETED or FAILED
  Future<Map<String, dynamic>?> _pollForCompletion(String id) async {
    const maxAttempts = 60; // up to ~3 minutes with 3s intervals
    const pollInterval = Duration(seconds: 3);

    debugPrint('[VocabularyProvider] Starting polling for id=$id');

    for (var i = 0; i < maxAttempts; i++) {
      await Future.delayed(pollInterval);

      try {
        // Use a fresh query string each iteration to avoid any client-side caching
        final query = '''
          query GetVocabularyListPoll(\$id: ID!) {
            getVocabularyList(id: \$id) {
              id
              userId
              title
              sourceLanguage
              targetLanguage
              status
              errorMessage
              createdAt
              updatedAt
              words { word translation definition partOfSpeech exampleSentence difficulty }
            }
          }
        ''';

        debugPrint('[VocabularyProvider] Poll attempt ${i + 1}/$maxAttempts for id=$id');

        final request = GraphQLRequest<String>(
          document: query,
          variables: {'id': id},
        );
        final gqlResponse = await Amplify.API.query(request: request).response;

        if (gqlResponse.hasErrors) {
          final errors = gqlResponse.errors.map((e) => e.message).join(', ');
          debugPrint('[VocabularyProvider] Poll GraphQL errors: $errors');
          continue;
        }

        if (gqlResponse.data == null) {
          debugPrint('[VocabularyProvider] Poll returned null data');
          continue;
        }

        final parsed = jsonDecode(gqlResponse.data!) as Map<String, dynamic>;
        final list = parsed['getVocabularyList'] as Map<String, dynamic>?;

        if (list == null) {
          debugPrint('[VocabularyProvider] Poll returned null list');
          continue;
        }

        final status = list['status'] as String?;
        final wordsCount = (list['words'] as List<dynamic>?)?.length ?? 0;
        debugPrint('[VocabularyProvider] Poll result: status=$status, words=$wordsCount, title=${list['title']}');

        if (status == 'COMPLETED') return list;
        if (status == 'FAILED') {
          _error = list['errorMessage'] as String? ?? 'Analysis failed';
          return null;
        }

        // Fallback: if status field is missing (schema not deployed yet),
        // check if words have been populated as a completion signal
        if (status == null && wordsCount > 0) {
          debugPrint('[VocabularyProvider] No status field but words found — treating as completed');
          return list;
        }

        // Still PENDING — keep polling
      } catch (e) {
        debugPrint('[VocabularyProvider] Polling error (attempt ${i + 1}): $e');
        // Don't break on transient errors, keep trying
      }
    }

    debugPrint('[VocabularyProvider] Polling timed out for id=$id');
    return null;
  }

  /// Rename a vocabulary list
  Future<bool> renameVocabularyList(String id, String newTitle) async {
    try {
      const mutation = '''
        mutation RenameVocabularyList(\$input: RenameVocabularyListInput!) {
          renameVocabularyList(input: \$input) {
            success
            vocabularyList {
              id title
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {'id': id, 'title': newTitle},
        },
      );

      final result = response['renameVocabularyList'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final idx = _vocabularyLists.indexWhere((list) => list['id'] == id);
        if (idx != -1) {
          _vocabularyLists[idx]['title'] = newTitle;
        }
        if (_currentList?['id'] == id) {
          _currentList?['title'] = newTitle;
        }
        notifyListeners();
        return true;
      } else {
        _error = result?['error'] as String? ?? 'Failed to rename vocabulary list';
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('Error renaming vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Delete a vocabulary list by ID
  Future<bool> deleteVocabularyList(String id) async {
    try {
      const mutation = '''
        mutation DeleteVocabularyList(\$id: ID!) {
          deleteVocabularyList(id: \$id) {
            success
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {'id': id},
      );

      final result = response['deleteVocabularyList'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        _vocabularyLists.removeWhere((list) => list['id'] == id);
        if (_currentList?['id'] == id) {
          _currentList = null;
        }
        notifyListeners();
        return true;
      } else {
        _error = result?['error'] as String? ?? 'Failed to delete vocabulary list';
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('Error deleting vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Export a vocabulary list as a txt file in "word = translation" format
  Future<void> exportAsText(Map<String, dynamic> list) async {
    final title = list['title'] as String? ?? 'vocabulary';
    final words = (list['words'] as List<dynamic>?) ?? [];

    final lines = words.map((w) {
      final word = (w as Map<String, dynamic>)['word'] as String? ?? '';
      final translation = w['translation'] as String? ?? '';
      return '$word = $translation';
    });

    final content = lines.join('\n');

    await Share.share(content, subject: title);
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
