import 'package:flutter/foundation.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import '../services/auth_service.dart';

/// Provider for managing authentication state
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  AuthUser? _currentUser;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _error;
  /// Set when sign-in requires a new password (admin-created users).
  bool _needsNewPassword = false;

  AuthUser? get currentUser => _currentUser;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get needsNewPassword => _needsNewPassword;

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

  /// Sign in with email and password.
  /// Returns true if fully signed in, false otherwise.
  /// Check [needsNewPassword] if false — the user may need to set a new password.
  Future<bool> signIn(String email, String password) async {
    _isLoading = true;
    _error = null;
    _needsNewPassword = false;
    notifyListeners();

    try {
      final result = await _authService.signIn(email, password);

      if (result.nextStep.signInStep == AuthSignInStep.confirmSignInWithNewPassword) {
        _needsNewPassword = true;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (!result.isSignedIn) {
        throw Exception('Sign in failed');
      }

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

  /// Complete the NEW_PASSWORD_REQUIRED challenge.
  Future<bool> confirmNewPassword(String newPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.confirmSignInWithNewPassword(newPassword);
      if (!result.isSignedIn) {
        throw Exception('Sign in failed after setting new password');
      }
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _needsNewPassword = false;
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Initiate a password reset — sends a verification code to the user's email.
  Future<bool> resetPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.resetPassword(email);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Confirm the password reset with the code and new password, then sign in.
  Future<bool> confirmResetPassword(
    String email,
    String code,
    String newPassword,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.confirmResetPassword(email, code, newPassword);
      // Auto sign-in after successful reset
      return await signIn(email, newPassword);
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
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

  /// Register a new user (returns true if sign-up succeeded, user still needs verification)
  Future<bool> register(String email, String password, {String? name}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.register(email, password, name: name);
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Confirm sign up with verification code, then sign in
  Future<bool> confirmSignUp(String email, String password, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final confirmed = await _authService.confirmSignUp(email, code);
      if (!confirmed) {
        _error = 'Verification failed. Please try again.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // Auto sign-in after successful verification
      await _authService.signIn(email, password);
      _currentUser = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Resend the verification code
  Future<bool> resendCode(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.resendSignUpCode(email);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
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
