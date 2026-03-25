import 'package:flutter/foundation.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';

/// Authentication service using AWS Amplify Cognito
class AuthService {
  /// Sign in with email and password
  Future<AuthTokens> signIn(String email, String password) async {
    try {
      final result = await Amplify.Auth.signIn(
        username: email,
        password: password,
      );

      if (!result.isSignedIn) {
        throw Exception('Sign in failed');
      }

      // Fetch the session to get tokens
      final session = await Amplify.Auth.fetchAuthSession();
      if (session is CognitoAuthSession) {
        final tokens = session.userPoolTokensResult.value;
        // In Amplify 2.x, tokens are already strings
        final accessTokenStr = tokens.accessToken.toString();
        final refreshTokenStr = tokens.refreshToken?.toString() ?? '';
        final idTokenStr = tokens.idToken.toString();
        
        return AuthTokens(
          accessToken: accessTokenStr,
          refreshToken: refreshTokenStr,
          idToken: idTokenStr,
          expiresIn: 3600, // Default 1 hour
        );
      }

      throw Exception('Failed to retrieve auth tokens');
    } on AuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    try {
      await Amplify.Auth.signOut();
    } on AuthException catch (e) {
      debugPrint('Error signing out: ${e.message}');
      rethrow;
    }
  }

  /// Register a new user
  Future<void> register(String email, String password, {String? name}) async {
    try {
      final userAttributes = <AuthUserAttributeKey, String>{
        AuthUserAttributeKey.email: email,
        if (name != null) AuthUserAttributeKey.name: name,
      };

      final result = await Amplify.Auth.signUp(
        username: email,
        password: password,
        options: SignUpOptions(
          userAttributes: userAttributes,
        ),
      );

      if (!result.isSignUpComplete) {
        throw Exception('Sign up incomplete - verification required');
      }
    } on AuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  /// Get the current authenticated user
  Future<AuthUser> getCurrentUser() async {
    try {
      return await Amplify.Auth.getCurrentUser();
    } on AuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  /// Check if a user is currently signed in
  Future<bool> isUserSignedIn() async {
    try {
      final session = await Amplify.Auth.fetchAuthSession();
      return session.isSignedIn;
    } catch (e) {
      debugPrint('Error checking sign in status: $e');
      return false;
    }
  }

  /// Refresh authentication tokens
  Future<AuthTokens> refreshTokens(String refreshToken) async {
    try {
      // Amplify handles token refresh automatically
      final session = await Amplify.Auth.fetchAuthSession();
      if (session is CognitoAuthSession) {
        final tokens = session.userPoolTokensResult.value;
        // In Amplify 2.x, tokens are already strings
        final accessTokenStr = tokens.accessToken.toString();
        final refreshTokenStr = tokens.refreshToken?.toString() ?? refreshToken;
        final idTokenStr = tokens.idToken.toString();
        
        return AuthTokens(
          accessToken: accessTokenStr,
          refreshToken: refreshTokenStr,
          idToken: idTokenStr,
          expiresIn: 3600,
        );
      }

      throw Exception('Failed to refresh tokens');
    } on AuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  /// Handle Amplify auth exceptions and convert to user-friendly messages
  Exception _handleAuthException(AuthException e) {
    String message;

    if (e.message.contains('UserNotConfirmedException')) {
      message = 'Please verify your email address';
    } else if (e.message.contains('NotAuthorizedException')) {
      message = 'Invalid email or password';
    } else if (e.message.contains('UserNotFoundException')) {
      message = 'User not found';
    } else if (e.message.contains('UsernameExistsException')) {
      message = 'An account with this email already exists';
    } else if (e.message.contains('InvalidPasswordException')) {
      message = 'Password does not meet requirements';
    } else if (e.message.contains('TooManyRequestsException')) {
      message = 'Too many attempts. Please try again later';
    } else {
      message = e.message;
    }

    return Exception(message);
  }
}

/// Authentication tokens returned from sign in
class AuthTokens {
  final String accessToken;
  final String refreshToken;
  final String idToken;
  final int expiresIn;

  AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.idToken,
    required this.expiresIn,
  });
}
