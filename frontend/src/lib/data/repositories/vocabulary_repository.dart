import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:http/http.dart' as http;

import '../../domain/models/vocabulary_list.dart';
import '../../domain/result.dart';
import '../../services/api_service.dart';

/// Repository for vocabulary list data operations.
/// Encapsulates GraphQL queries/mutations and S3 image operations.
class VocabularyRepository {
  final ApiService _apiService;

  VocabularyRepository({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  /// Load all vocabulary lists for the current user.
  Future<Result<List<VocabularyList>>> getVocabularyLists() async {
    try {
      const query = '''
        query GetVocabularyLists {
          getVocabularyLists {
            id userId title sourceImageKey sourceImageKeys
            sourceLanguage targetLanguage status errorMessage
            isPublic publisher schoolForm grade isbn
            createdAt updatedAt
            words { word translation definition partOfSpeech
                    exampleSentence difficulty unit flagged }
          }
        }
      ''';

      final response = await _apiService.query(query);
      final lists = response['getVocabularyLists'] as List<dynamic>?;
      final result = lists
              ?.map((item) =>
                  VocabularyList.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [];
      return Result.success(result);
    } catch (e) {
      debugPrint('Error loading vocabulary lists: $e');
      return Result.failure(e.toString());
    }
  }

  /// Get a single vocabulary list by ID.
  Future<Result<VocabularyList>> getVocabularyList(String id) async {
    try {
      const query = '''
        query GetVocabularyList(\$id: ID!) {
          getVocabularyList(id: \$id) {
            id userId title sourceImageKey sourceImageKeys
            sourceLanguage targetLanguage status errorMessage
            isPublic publisher schoolForm grade isbn
            createdAt updatedAt
            words { word translation definition partOfSpeech
                    exampleSentence difficulty unit flagged }
          }
        }
      ''';

      final response = await _apiService.query(query, variables: {'id': id});
      final data = response['getVocabularyList'] as Map<String, dynamic>?;
      if (data == null) {
        return const Result.failure('Vocabulary list not found');
      }
      return Result.success(VocabularyList.fromJson(data));
    } catch (e) {
      debugPrint('Error getting vocabulary list: $e');
      return Result.failure(e.toString());
    }
  }

  /// Load all public vocabulary lists.
  Future<Result<List<VocabularyList>>> getPublicVocabularyLists() async {
    try {
      const query = '''
        query GetPublicVocabularyLists {
          getPublicVocabularyLists {
            id userId title sourceLanguage targetLanguage status
            isPublic publisher schoolForm grade isbn
            createdAt updatedAt
            words { word translation definition partOfSpeech
                    exampleSentence difficulty unit flagged }
          }
        }
      ''';

      final response = await _apiService.query(query);
      final lists = response['getPublicVocabularyLists'] as List<dynamic>?;
      final result = lists
              ?.map((item) =>
                  VocabularyList.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [];
      return Result.success(result);
    } catch (e) {
      debugPrint('Error loading public vocabulary lists: $e');
      return Result.failure(e.toString());
    }
  }

  /// Rename a vocabulary list.
  Future<Result<void>> renameVocabularyList(String id, String newTitle) async {
    try {
      const mutation = '''
        mutation RenameVocabularyList(\$input: RenameVocabularyListInput!) {
          renameVocabularyList(input: \$input) {
            success
            vocabularyList { id title }
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
        return const Result.success(null);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to rename vocabulary list',
      );
    } catch (e) {
      debugPrint('Error renaming vocabulary list: $e');
      return Result.failure(e.toString());
    }
  }

  /// Delete a vocabulary list by ID.
  Future<Result<void>> deleteVocabularyList(String id) async {
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
        return const Result.success(null);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to delete vocabulary list',
      );
    } catch (e) {
      debugPrint('Error deleting vocabulary list: $e');
      return Result.failure(e.toString());
    }
  }

  /// Set a vocabulary list's public visibility.
  Future<Result<void>> setVocabularyListPublic(String id, bool isPublic) async {
    try {
      const mutation = '''
        mutation SetVocabularyListPublic(\$input: SetVocabularyListPublicInput!) {
          setVocabularyListPublic(input: \$input) {
            success
            vocabularyList { id isPublic }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {'id': id, 'isPublic': isPublic},
        },
      );

      final result =
          response['setVocabularyListPublic'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        return const Result.success(null);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to update visibility',
      );
    } catch (e) {
      debugPrint('Error setting vocabulary list public: $e');
      return Result.failure(e.toString());
    }
  }

  /// Update a vocabulary list (title, languages, words, metadata).
  Future<Result<VocabularyList>> updateVocabularyList(
    String id, {
    String? title,
    String? sourceLanguage,
    String? targetLanguage,
    List<Map<String, dynamic>>? words,
    String? publisher,
    String? schoolForm,
    String? grade,
    String? isbn,
  }) async {
    try {
      const mutation = '''
        mutation UpdateVocabularyList(\$input: UpdateVocabularyListInput!) {
          updateVocabularyList(input: \$input) {
            success
            vocabularyList {
              id userId title sourceLanguage targetLanguage status
              errorMessage isPublic publisher schoolForm grade isbn
              createdAt updatedAt
              words { word translation definition partOfSpeech
                      exampleSentence difficulty unit flagged }
            }
            error
          }
        }
      ''';

      final input = <String, dynamic>{'id': id};
      if (title != null) input['title'] = title;
      if (sourceLanguage != null) input['sourceLanguage'] = sourceLanguage;
      if (targetLanguage != null) input['targetLanguage'] = targetLanguage;
      if (words != null) input['words'] = words;
      if (publisher != null) input['publisher'] = publisher;
      if (schoolForm != null) input['schoolForm'] = schoolForm;
      if (grade != null) input['grade'] = grade;
      if (isbn != null) input['isbn'] = isbn;

      final response = await _apiService.mutate(
        mutation,
        variables: {'input': input},
      );

      final result =
          response['updateVocabularyList'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final updated = result['vocabularyList'] as Map<String, dynamic>?;
        if (updated != null) {
          return Result.success(VocabularyList.fromJson(updated));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to update vocabulary list',
      );
    } catch (e) {
      debugPrint('Error updating vocabulary list: $e');
      return Result.failure(e.toString());
    }
  }

  /// Flag a word in a vocabulary list for review.
  Future<Result<void>> flagWord(String vocabularyListId, String word) async {
    try {
      const mutation = '''
        mutation FlagWord(\$input: FlagWordInput!) {
          flagWord(input: \$input) {
            success
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'vocabularyListId': vocabularyListId,
            'word': word,
          },
        },
      );

      final result = response['flagWord'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        return const Result.success(null);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to flag word',
      );
    } catch (e) {
      debugPrint('Error flagging word: $e');
      return Result.failure(e.toString());
    }
  }

  /// Get presigned upload URLs from the backend.
  Future<Result<List<Map<String, dynamic>>>> getUploadUrls(int count) async {
    try {
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

      final result =
          response['getImageUploadUrls'] as Map<String, dynamic>?;
      if (result?['success'] == true) {
        final uploads = (result!['uploads'] as List<dynamic>)
            .map((u) => u as Map<String, dynamic>)
            .toList();
        return Result.success(uploads);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to get upload URLs',
      );
    } catch (e) {
      debugPrint('Error getting upload URLs: $e');
      return Result.failure(e.toString());
    }
  }

  /// Upload a single image to S3 via presigned URL.
  Future<Result<void>> uploadToS3(String uploadUrl, Uint8List imageBytes) async {
    try {
      final response = await http.put(
        Uri.parse(uploadUrl),
        headers: {'Content-Type': 'image/jpeg'},
        body: imageBytes,
      );
      if (response.statusCode != 200) {
        return Result.failure(
          'S3 upload failed with status ${response.statusCode}',
        );
      }
      return const Result.success(null);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  /// Analyze images for vocabulary (Phase 1 or full analysis).
  Future<Result<VocabularyList>> analyzeImageVocabulary({
    required List<String> s3Keys,
    String? sourceLanguage,
    String? targetLanguage,
    String? mode,
  }) async {
    try {
      const mutation = '''
        mutation AnalyzeImageVocabulary(\$input: AnalyzeImageVocabularyInput!) {
          analyzeImageVocabulary(input: \$input) {
            success
            vocabularyList {
              id userId title sourceLanguage targetLanguage status
              errorMessage createdAt updatedAt
              words { word translation definition partOfSpeech
                      exampleSentence difficulty unit flagged }
            }
            error
          }
        }
      ''';

      final input = <String, dynamic>{'imageS3Keys': s3Keys};
      if (sourceLanguage != null) input['sourceLanguage'] = sourceLanguage;
      if (targetLanguage != null) input['targetLanguage'] = targetLanguage;
      if (mode != null) input['mode'] = mode;

      final response = await _apiService.mutate(
        mutation,
        variables: {'input': input},
      );

      final result =
          response['analyzeImageVocabulary'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final vocabData =
            result['vocabularyList'] as Map<String, dynamic>?;
        if (vocabData != null) {
          return Result.success(VocabularyList.fromJson(vocabData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to analyze images',
      );
    } catch (e) {
      debugPrint('Error analyzing images: $e');
      return Result.failure(e.toString());
    }
  }

  /// Translate recognized words (Phase 2 of Scan & Translate).
  Future<Result<VocabularyList>> translateRecognizedWords(
    String vocabularyListId,
    String targetLanguage,
  ) async {
    try {
      const mutation = '''
        mutation TranslateRecognizedWords(\$input: TranslateRecognizedWordsInput!) {
          translateRecognizedWords(input: \$input) {
            success
            vocabularyList {
              id userId title sourceLanguage targetLanguage status
              errorMessage createdAt updatedAt
              words { word translation definition partOfSpeech
                      exampleSentence difficulty unit flagged }
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'vocabularyListId': vocabularyListId,
            'targetLanguage': targetLanguage,
          },
        },
      );

      final result =
          response['translateRecognizedWords'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final vocabData =
            result['vocabularyList'] as Map<String, dynamic>?;
        if (vocabData != null) {
          return Result.success(VocabularyList.fromJson(vocabData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to translate recognized words',
      );
    } catch (e) {
      debugPrint('Error translating recognized words: $e');
      return Result.failure(e.toString());
    }
  }

  /// Poll a vocabulary list until it reaches the target status.
  /// Uses direct Amplify API to avoid any client-side caching.
  Future<Result<VocabularyList>> pollForCompletion(
    String id, {
    String? targetStatus,
    int maxAttempts = 60,
    Duration pollInterval = const Duration(seconds: 3),
  }) async {
    for (var i = 0; i < maxAttempts; i++) {
      await Future.delayed(pollInterval);

      try {
        final query = '''
          query GetVocabularyListPoll(\$id: ID!) {
            getVocabularyList(id: \$id) {
              id userId title sourceLanguage targetLanguage
              status errorMessage createdAt updatedAt
              words { word translation definition partOfSpeech
                      exampleSentence difficulty unit flagged }
            }
          }
        ''';

        final request = GraphQLRequest<String>(
          document: query,
          variables: {'id': id},
        );
        final gqlResponse =
            await Amplify.API.query(request: request).response;

        if (gqlResponse.hasErrors || gqlResponse.data == null) continue;

        final parsed =
            jsonDecode(gqlResponse.data!) as Map<String, dynamic>;
        final listData =
            parsed['getVocabularyList'] as Map<String, dynamic>?;
        if (listData == null) continue;

        final status = listData['status'] as String?;

        if (status == 'FAILED') {
          final errorMsg =
              listData['errorMessage'] as String? ?? 'Analysis failed';
          return Result.failure(errorMsg);
        }

        if (targetStatus == 'RECOGNIZED') {
          if (status == 'RECOGNIZED') {
            return Result.success(VocabularyList.fromJson(listData));
          }
        } else {
          if (status == 'COMPLETED' || status == 'PARTIALLY_COMPLETED') {
            return Result.success(VocabularyList.fromJson(listData));
          }
        }

        // Fallback: if no status but words exist
        final wordsCount =
            (listData['words'] as List<dynamic>?)?.length ?? 0;
        if (status == null && wordsCount > 0) {
          return Result.success(VocabularyList.fromJson(listData));
        }
      } catch (e) {
        debugPrint('Polling error (attempt ${i + 1}): $e');
      }
    }

    return const Result.failure('Polling timed out');
  }

  /// Get presigned download URLs for source images.
  Future<Result<List<Map<String, dynamic>>>> getImageDownloadUrls(
    List<String> s3Keys,
  ) async {
    try {
      const query = '''
        query GetImageDownloadUrl(\$input: GetImageDownloadUrlInput!) {
          getImageDownloadUrl(input: \$input) {
            success
            downloadUrls { s3Key downloadUrl }
            error
          }
        }
      ''';

      final response = await _apiService.query(
        query,
        variables: {'input': {'s3Keys': s3Keys}},
      );

      final result =
          response['getImageDownloadUrl'] as Map<String, dynamic>?;
      if (result?['success'] == true) {
        final urls = (result!['downloadUrls'] as List<dynamic>)
            .map((u) => u as Map<String, dynamic>)
            .toList();
        return Result.success(urls);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to get image download URLs',
      );
    } catch (e) {
      debugPrint('Error getting image download URLs: $e');
      return Result.failure(e.toString());
    }
  }
}
