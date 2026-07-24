import 'package:flutter/foundation.dart';
import '../data/repositories/user_repository.dart';
import '../domain/models/user.dart';
import '../domain/result.dart';
import '../providers/auth_provider.dart';

/// Provider for managing user data.
///
/// Delegates data fetching to [UserRepository] and exposes typed [AppUser]
/// state to the UI layer.
class UserProvider extends ChangeNotifier {
  final UserRepository _repository;

  AppUser? _user;
  bool _isLoading = false;
  String? _error;
  AuthProvider? _authProvider;

  static const _adminEmails = [
    'johannes.koch@gmail.com',
    'lockhead+joe1@lockhead.info',
    'lockhead@lockhead.info',
  ];

  UserProvider({UserRepository? repository})
      : _repository = repository ?? UserRepository();

  /// The current user's typed domain model.
  AppUser? get user => _user;

  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Whether the current user is an admin.
  bool get isAdmin {
    final email = _user?.email
        ?? _authProvider?.cognitoEmail
        ?? _authProvider?.currentUser?.username;
    final trimmedEmail = email?.trim().toLowerCase();
    return trimmedEmail != null && _adminEmails.contains(trimmedEmail);
  }

  /// Update auth provider reference.
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _user == null) {
      loadUser();
    }
  }

  /// Load user data from API.
  Future<void> loadUser() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) {
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final userId = _authProvider!.currentUser?.userId;
      if (userId == null) {
        throw Exception('No user ID available');
      }

      final result = await _repository.getUser(userId);
      switch (result) {
        case Success(:final value):
          _user = value;
          _error = null;
          await _autoRepairEmail();
        case Failure(:final error):
          _error = error;
          _user = null;
      }
    } catch (e) {
      debugPrint('Error loading user: $e');
      _error = e.toString();
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update user data.
  Future<bool> updateUser(String userId, {String? name, String? email}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.updateUser(userId, name: name, email: email);
      switch (result) {
        case Success(:final value):
          _user = value;
          _error = null;
          _isLoading = false;
          notifyListeners();
          return true;
        case Failure(:final error):
          _error = error;
          _isLoading = false;
          notifyListeners();
          return false;
      }
    } catch (e) {
      debugPrint('Error updating user: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Auto-repair: backfill email in DynamoDB if missing.
  Future<void> _autoRepairEmail() async {
    if (_user == null) return;
    final dbEmail = _user!.email;
    final cognitoEmail = _authProvider?.currentUser?.username;
    if ((dbEmail == null || dbEmail.isEmpty) &&
        cognitoEmail != null &&
        cognitoEmail.isNotEmpty) {
      debugPrint(
          '[UserProvider] Auto-repairing missing email in DB with Cognito email: $cognitoEmail');
      await updateUser(_user!.id, email: cognitoEmail);
    }
  }

  /// Fetch all users (admin only).
  Future<List<AppUser>> getUsers() async {
    final result = await _repository.getUsers();
    return result.valueOrNull ?? [];
  }

  /// Admin set user tier (admin only).
  Future<AppUser?> adminSetUserTier(String userId, String tier) async {
    final result = await _repository.adminSetUserTier(userId, tier);
    return result.valueOrNull;
  }

  /// Fetch tier statistics (admin only).
  Future<List<Map<String, dynamic>>> getTierStatistics() async {
    final result = await _repository.getTierStatistics();
    return result.valueOrNull ?? [];
  }

  /// Migrate data from one user to another (admin only).
  Future<Map<String, dynamic>?> migrateUserData(
    String sourceUserId,
    String targetUserId,
  ) async {
    final result = await _repository.migrateUserData(sourceUserId, targetUserId);
    switch (result) {
      case Success(:final value):
        return value;
      case Failure(:final error):
        return {
          'success': false,
          'error': error,
          'migratedVocabularyLists': 0,
          'migratedTrainings': 0,
          'migratedExecutions': 0,
        };
    }
  }

  /// Sync Cognito users missing from DynamoDB (admin only).
  Future<Map<String, dynamic>?> syncMissingUsers() async {
    final result = await _repository.syncMissingUsers();
    switch (result) {
      case Success(:final value):
        return {'success': true, 'createdCount': value};
      case Failure(:final error):
        return {'success': false, 'createdCount': 0, 'error': error};
    }
  }

  /// Clear user data (on sign out).
  void clear() {
    _user = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}
