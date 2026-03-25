import 'package:flutter/foundation.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../services/auth_service.dart';

/// Provider for managing authentication state
class AuthProvider extends ChangeNotifier {
  AuthService _authService;

  AuthUser? _currentUser;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _error;

  AuthUser? get currentUser => _currentUser;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthProvider({AuthService? authService}) : _authService = authService ?? AuthService() {
    _checkAuthStatus();
  }

  /// Check current authentication status
  Future<void> _checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Check if Amplify is configured before checking auth status
      if (!Amplify.isConfigured) {
        debugPrint('Amplify not configured, skipping auth check');
        _currentUser = null;
        _isAuthenticated = false;
        _error = null;
        _isLoading = false;
        notifyListeners();
        return;
      }

      final isSignedIn = await _authService.isUserSignedIn();
      if (isSignedIn) {
        _currentUser = await _authService.getCurrentUser();
        _isAuthenticated = true;
      } else {
        _currentUser = null;
        _isAuthenticated = false;
      }
      _error = null;
    } catch (e) {
      debugPrint('Error checking auth status: $e');
      _currentUser = null;
      _isAuthenticated = false;
      _error = null; // Don't show error on initial check
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Sign in with email and password
  Future<bool> signIn(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.signIn(email, password);
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isAuthenticated = false;
      _currentUser = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.signOut();
      _currentUser = null;
      _isAuthenticated = false;
      _error = null;
    } catch (e) {
      debugPrint('Error signing out: $e');
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Register a new user
  Future<bool> register(String email, String password, {String? name}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.register(email, password, name: name);
      
      // After successful registration, sign in automatically
      await _authService.signIn(email, password);
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isAuthenticated = false;
      _currentUser = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Clear any error messages
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
