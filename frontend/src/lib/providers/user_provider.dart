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

  static const _adminEmails = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info'];

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Whether the current user is an admin
  bool get isAdmin {
    final email = _user?['email'] as String?;
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
  Future<bool> updateUser(String userId, {String? name}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation UpdateUser(\$id: ID!, \$name: String) {
          updateUser(id: \$id, name: \$name) {
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

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'id': userId,
          if (name != null) 'name': name,
        },
      );

      _user = response['updateUser'] as Map<String, dynamic>?;
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

  /// Clear user data (on sign out)
  void clear() {
    _user = null;
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}
