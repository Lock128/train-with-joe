import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

/// Provider for managing user data
class UserProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _error;
  AuthProvider? _authProvider;

  static const _adminEmails = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info', 'lockhead@lockhead.info'];

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Whether the current user is an admin or not
  bool get isAdmin {
    // Try DB email first, fall back to Cognito username (which is the email for email-based auth)
    final email = (_user?['email'] as String?) ?? _authProvider?.currentUser?.username;
    final trimmedEmail = email?.trim().toLowerCase();
    debugPrint('[UserProvider] isAdmin check — raw email: "$email", trimmed: "$trimmedEmail", adminList: $_adminEmails, match: ${trimmedEmail != null && _adminEmails.contains(trimmedEmail)}');
    return trimmedEmail != null && _adminEmails.contains(trimmedEmail);
  }

  /// Update auth provider reference
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _user == null) {
      loadUser();
    }
  }

  /// Load user data from API
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

      const query = '''
        query GetUser(\$id: ID!) {
          getUser(id: \$id) {
            id
            email
            name
            subscriptionStatus
            subscriptionProvider
            createdAt
            updatedAt
          }
        }
      ''';

      final response = await _apiService.query(
        query,
        variables: {'id': userId},
      );

      _user = response['getUser'] as Map<String, dynamic>?;
      _error = null;

      // Auto-repair: if DB email is missing but we have it from Cognito, backfill it
      await _autoRepairEmail();
    } catch (e) {
      debugPrint('Error loading user: $e');
      _error = e.toString();
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update user data
  Future<bool> updateUser(String userId, {String? name, String? email}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation UpdateUser(\$input: UpdateUserInput!) {
          updateUser(input: \$input) {
            success
            user {
              id
              email
              name
              subscriptionStatus
              subscriptionProvider
              createdAt
              updatedAt
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'id': userId,
            if (name != null) 'name': name,
            if (email != null) 'email': email,
          },
        },
      );

      final result = response['updateUser'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        _user = result['user'] as Map<String, dynamic>?;
      }
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error updating user: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Auto-repair: backfill email in DynamoDB if missing
  Future<void> _autoRepairEmail() async {
    if (_user == null) return;
    final dbEmail = _user!['email'] as String?;
    final cognitoEmail = _authProvider?.currentUser?.username;
    if ((dbEmail == null || dbEmail.isEmpty) && cognitoEmail != null && cognitoEmail.isNotEmpty) {
      debugPrint('[UserProvider] Auto-repairing missing email in DB with Cognito email: $cognitoEmail');
      final userId = _user!['id'] as String?;
      if (userId != null) {
        await updateUser(userId, email: cognitoEmail);
      }
    }
  }

  /// Fetch all users (admin only). Returns a list of {id, email, name}.
  Future<List<Map<String, dynamic>>> getUsers() async {
    try {
      const query = '''
        query GetUsers {
          getUsers {
            id
            email
            name
          }
        }
      ''';
      final response = await _apiService.query(query);
      final list = response['getUsers'] as List<dynamic>?;
      if (list == null) return [];
      return list.cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('Error fetching users: $e');
      return [];
    }
  }

  /// Migrate vocabulary lists, trainings, and executions from one user to another (admin only).
  /// Returns the response map with success, counts, and error.
  Future<Map<String, dynamic>?> migrateUserData(String sourceUserId, String targetUserId) async {
    try {
      const mutation = '''
        mutation MigrateUserData(\$input: MigrateUserDataInput!) {
          migrateUserData(input: \$input) {
            success
            migratedVocabularyLists
            migratedTrainings
            migratedExecutions
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'sourceUserId': sourceUserId,
            'targetUserId': targetUserId,
          },
        },
      );

      return response['migrateUserData'] as Map<String, dynamic>?;
    } catch (e) {
      debugPrint('Error migrating user data: $e');
      return {'success': false, 'error': e.toString(), 'migratedVocabularyLists': 0, 'migratedTrainings': 0, 'migratedExecutions': 0};
    }
  }

  /// Clear user data (on sign out)
  void clear() {
    _user = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}
