import 'package:flutter/foundation.dart';
import 'package:share_plus/share_plus.dart';

import '../data/repositories/vocabulary_repository.dart';
import '../domain/models/vocabulary_list.dart';
import '../domain/result.dart';
import '../providers/auth_provider.dart';

/// Provider for managing vocabulary list state.
///
/// Delegates data fetching to [VocabularyRepository] and exposes typed
/// [VocabularyList] state to the UI layer.
class VocabularyProvider extends ChangeNotifier {
  final VocabularyRepository _repository;

  List<VocabularyList> _vocabularyLists = [];
  VocabularyList? _currentList;
  bool _isLoading = false;
  bool _isAnalyzing = false;
  String? _error;
  AuthProvider? _authProvider;

  VocabularyProvider({VocabularyRepository? repository})
      : _repository = repository ?? VocabularyRepository();

  List<VocabularyList> get vocabularyLists => _vocabularyLists;
  VocabularyList? get currentList => _currentList;
  bool get isLoading => _isLoading;
  bool get isAnalyzing => _isAnalyzing;
  String? get error => _error;

  /// Update auth provider reference.
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _vocabularyLists.isEmpty) {
      loadVocabularyLists();
    }
  }

  /// Load all vocabulary lists for the current user.
  Future<void> loadVocabularyLists() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.getVocabularyLists();
      switch (result) {
        case Success(:final value):
          _vocabularyLists = value;
          _error = null;
        case Failure(:final error):
          _error = error;
          _vocabularyLists = [];
      }
    } catch (e) {
      debugPrint('Error loading vocabulary lists: $e');
      _error = e.toString();
      _vocabularyLists = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get a single vocabulary list by ID.
  Future<VocabularyList?> getVocabularyList(String id) async {
    try {
      final result = await _repository.getVocabularyList(id);
      switch (result) {
        case Success(:final value):
          _currentList = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
          notifyListeners();
          return null;
      }
    } catch (e) {
      debugPrint('Error getting vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Upload images to S3 and analyze them for vocabulary words.
  Future<VocabularyList?> analyzeImages(
    List<Uint8List> images, {
    String? sourceLanguage,
    String? targetLanguage,
  }) async {
    _isAnalyzing = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Get presigned upload URLs
      final urlsResult = await _repository.getUploadUrls(images.length);
      if (urlsResult.isFailure) {
        throw Exception(urlsResult.errorOrNull ?? 'Failed to get upload URLs');
      }
      final uploads = urlsResult.valueOrNull!;
      if (uploads.length != images.length) {
        throw Exception('Failed to get upload URLs');
      }

      // 2. Upload all images to S3 in parallel
      await Future.wait(
        List.generate(images.length, (i) async {
          final uploadResult = await _repository.uploadToS3(
            uploads[i]['uploadUrl'] as String,
            images[i],
          );
          if (uploadResult.isFailure) {
            throw Exception(uploadResult.errorOrNull ?? 'S3 upload failed');
          }
        }),
      );

      // 3. Call the analyze mutation with S3 keys
      final s3Keys = uploads.map((u) => u['s3Key'] as String).toList();
      final analyzeResult = await _repository.analyzeImageVocabulary(
        s3Keys: s3Keys,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      );

      switch (analyzeResult) {
        case Success(:final value):
          // Poll until the async processing completes
          final pollResult = await _repository.pollForCompletion(value.id);
          switch (pollResult) {
            case Success(:final value):
              _currentList = value;
              _vocabularyLists.add(value);
              return value;
            case Failure(:final error):
              if (error == 'Polling timed out') {
                _error = 'Processing is running in the background. Please check your vocabulary lists in a few minutes.';
                _vocabularyLists.add(value);
                notifyListeners();
                return null;
              }
              _error = error;
              _vocabularyLists.add(value);
              return null;
          }
        case Failure(:final error):
          _error = error;
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

  /// Upload images and perform Phase 1 (OCR recognition) of Scan & Translate.
  Future<VocabularyList?> analyzeScanTranslate(List<Uint8List> images) async {
    _isAnalyzing = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Get presigned upload URLs
      final urlsResult = await _repository.getUploadUrls(images.length);
      if (urlsResult.isFailure) {
        throw Exception(urlsResult.errorOrNull ?? 'Failed to get upload URLs');
      }
      final uploads = urlsResult.valueOrNull!;

      // 2. Upload all images to S3 in parallel
      await Future.wait(
        List.generate(images.length, (i) async {
          final uploadResult = await _repository.uploadToS3(
            uploads[i]['uploadUrl'] as String,
            images[i],
          );
          if (uploadResult.isFailure) {
            throw Exception(uploadResult.errorOrNull ?? 'S3 upload failed');
          }
        }),
      );

      // 3. Call the mutation with scan_translate mode
      final s3Keys = uploads.map((u) => u['s3Key'] as String).toList();
      final analyzeResult = await _repository.analyzeImageVocabulary(
        s3Keys: s3Keys,
        mode: 'scan_translate',
      );

      switch (analyzeResult) {
        case Success(:final value):
          // Poll until Phase 1 completes (RECOGNIZED status)
          final pollResult = await _repository.pollForCompletion(
            value.id,
            targetStatus: 'RECOGNIZED',
          );
          switch (pollResult) {
            case Success(:final value):
              _currentList = value;
              _vocabularyLists.add(value);
              return value;
            case Failure(:final error):
              if (error == 'Polling timed out') {
                _error = 'Processing is running in the background. Please check your vocabulary lists in a few minutes.';
                _vocabularyLists.add(value);
                notifyListeners();
                return null;
              }
              _error = error;
              _vocabularyLists.add(value);
              return null;
          }
        case Failure(:final error):
          _error = error;
          return null;
      }
    } catch (e) {
      debugPrint('Error in scan & translate: $e');
      _error = e.toString();
      return null;
    } finally {
      _isAnalyzing = false;
      notifyListeners();
    }
  }

  /// Trigger Phase 2 translation of recognized words.
  Future<VocabularyList?> translateRecognizedWords(
    String vocabularyListId,
    String targetLanguage,
  ) async {
    try {
      final result = await _repository.translateRecognizedWords(
        vocabularyListId,
        targetLanguage,
      );
      switch (result) {
        case Success(:final value):
          final idx = _vocabularyLists.indexWhere((l) => l.id == vocabularyListId);
          if (idx != -1) _vocabularyLists[idx] = value;
          if (_currentList?.id == vocabularyListId) _currentList = value;
          notifyListeners();
          return value;
        case Failure(:final error):
          _error = error;
          notifyListeners();
          return null;
      }
    } catch (e) {
      debugPrint('Error translating recognized words: $e');
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Rename a vocabulary list.
  Future<bool> renameVocabularyList(String id, String newTitle) async {
    try {
      final result = await _repository.renameVocabularyList(id, newTitle);
      if (result.isSuccess) {
        final idx = _vocabularyLists.indexWhere((l) => l.id == id);
        if (idx != -1) {
          _vocabularyLists[idx] = _vocabularyLists[idx].copyWith(title: newTitle);
        }
        if (_currentList?.id == id) {
          _currentList = _currentList!.copyWith(title: newTitle);
        }
        notifyListeners();
        return true;
      }
      _error = result.errorOrNull;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Error renaming vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Delete a vocabulary list by ID.
  Future<bool> deleteVocabularyList(String id) async {
    try {
      final result = await _repository.deleteVocabularyList(id);
      if (result.isSuccess) {
        _vocabularyLists.removeWhere((l) => l.id == id);
        if (_currentList?.id == id) _currentList = null;
        notifyListeners();
        return true;
      }
      _error = result.errorOrNull;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Error deleting vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Set a vocabulary list's public visibility.
  Future<bool> setVocabularyListPublic(String id, bool isPublic) async {
    try {
      final result = await _repository.setVocabularyListPublic(id, isPublic);
      if (result.isSuccess) {
        final idx = _vocabularyLists.indexWhere((l) => l.id == id);
        if (idx != -1) {
          _vocabularyLists[idx] = _vocabularyLists[idx].copyWith(isPublic: isPublic);
        }
        if (_currentList?.id == id) {
          _currentList = _currentList!.copyWith(isPublic: isPublic);
        }
        notifyListeners();
        return true;
      }
      _error = result.errorOrNull;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Error setting vocabulary list public: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  List<VocabularyList> _publicVocabularyLists = [];
  List<VocabularyList> get publicVocabularyLists => _publicVocabularyLists;

  /// Load all public vocabulary lists.
  Future<void> loadPublicVocabularyLists() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.getPublicVocabularyLists();
      switch (result) {
        case Success(:final value):
          _publicVocabularyLists = value;
          _error = null;
        case Failure(:final error):
          _error = error;
          _publicVocabularyLists = [];
      }
    } catch (e) {
      debugPrint('Error loading public vocabulary lists: $e');
      _error = e.toString();
      _publicVocabularyLists = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update a vocabulary list (title, languages, words, metadata).
  Future<bool> updateVocabularyList(
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
      final result = await _repository.updateVocabularyList(
        id,
        title: title,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        words: words,
        publisher: publisher,
        schoolForm: schoolForm,
        grade: grade,
        isbn: isbn,
      );
      switch (result) {
        case Success(:final value):
          final idx = _vocabularyLists.indexWhere((l) => l.id == id);
          if (idx != -1) _vocabularyLists[idx] = value;
          if (_currentList?.id == id) _currentList = value;
          notifyListeners();
          return true;
        case Failure(:final error):
          _error = error;
          notifyListeners();
          return false;
      }
    } catch (e) {
      debugPrint('Error updating vocabulary list: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Flag a word in a vocabulary list for review.
  Future<bool> flagWord(String vocabularyListId, String word) async {
    try {
      final result = await _repository.flagWord(vocabularyListId, word);
      if (result.isSuccess) return true;
      _error = result.errorOrNull;
      notifyListeners();
      return false;
    } catch (e) {
      debugPrint('Error flagging word: $e');
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Export a vocabulary list as a text file in "word = translation" format.
  Future<void> exportAsText(VocabularyList list) async {
    final lines = list.words.map((w) => '${w.word} = ${w.translation ?? ""}');
    final content = lines.join('\n');
    await SharePlus.instance.share(ShareParams(text: content, title: list.title));
  }

  /// Get a presigned download URL for a source image.
  Future<String?> getImageDownloadUrl(String s3Key) async {
    final urls = await getImageDownloadUrls([s3Key]);
    return urls?.isNotEmpty == true ? urls!.first['downloadUrl'] as String? : null;
  }

  /// Get presigned download URLs for multiple source images.
  Future<List<Map<String, dynamic>>?> getImageDownloadUrls(List<String> s3Keys) async {
    final result = await _repository.getImageDownloadUrls(s3Keys);
    return result.valueOrNull;
  }

  /// Clear vocabulary data (on sign out).
  void clear() {
    _vocabularyLists = [];
    _publicVocabularyLists = [];
    _currentList = null;
    _error = null;
    _isLoading = false;
    _isAnalyzing = false;
    notifyListeners();
  }
}
