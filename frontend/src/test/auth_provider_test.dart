import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:minimal_saas_template/providers/auth_provider.dart' as app;
import 'package:minimal_saas_template/services/auth_service.dart';

import 'auth_provider_test.mocks.dart';

// Mock implementations for testing
class MockSignInDetails implements SignInDetails {
  @override
  AuthenticationFlowType get authFlowType => AuthenticationFlowType.userSrpAuth;

  @override
  String get runtimeTypeName => 'MockSignInDetails';

  @override
  Map<String, Object?> toJson() => {'authFlowType': authFlowType.name};

  @override
  List<Object?> get props => [authFlowType];
}

class MockAuthUser implements AuthUser {
  @override
  final String username;

  @override
  final String userId;

  MockAuthUser({required this.username, required this.userId});

  @override
  List<AuthUserAttribute> get userAttributes => [];

  @override
  SignInDetails get signInDetails => MockSignInDetails();

  @override
  String get runtimeTypeName => 'MockAuthUser';

  @override
  Map<String, Object?> toJson() => {'username': username, 'userId': userId};

  @override
  List<Object?> get props => [username, userId];

  @override
  bool? get stringify => true;
}

@GenerateMocks([AuthService])
void main() {
  late app.AuthProvider authProvider;
  late MockAuthService mockAuthService;

  // Helper to create mock AuthUser with required parameters
  AuthUser createMockUser(String userId, String username) {
    return MockAuthUser(userId: userId, username: username);
  }

  setUp(() {
    mockAuthService = MockAuthService();
    // Stub the isUserSignedIn method that's called in constructor
    when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => false);
    // Inject mock service via constructor
    authProvider = app.AuthProvider(authService: mockAuthService);
  });

  group('AuthProvider Widget Tests - Requirements 11.6, 11.7', () {
    test('initial state should be unauthenticated and not loading', () {
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, null);
      expect(authProvider.error, null);
    });

    test('signIn success should update state to authenticated', () async {
      // Arrange
      final mockUser = createMockUser('test-user-id', 'test@example.com');
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            idToken: 'id-token',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      // Act
      final result = await authProvider.signIn('test@example.com', 'password123');

      // Assert
      expect(result, true);
      expect(authProvider.isAuthenticated, true);
      expect(authProvider.currentUser, mockUser);
      expect(authProvider.error, null);
      expect(authProvider.isLoading, false);
    });

    test('signIn failure should set error and remain unauthenticated', () async {
      // Arrange
      when(mockAuthService.signIn(any, any))
          .thenThrow(Exception('Invalid email or password'));

      // Act
      final result = await authProvider.signIn('test@example.com', 'wrongpassword');

      // Assert
      expect(result, false);
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, null);
      expect(authProvider.error, 'Invalid email or password');
      expect(authProvider.isLoading, false);
    });

    test('signIn should set loading state during operation', () async {
      // Arrange
      final mockUser = createMockUser('test-user-id', 'test@example.com');
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async {
        await Future.delayed(Duration(milliseconds: 100));
        return AuthTokens(
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          idToken: 'id-token',
          expiresIn: 3600,
        );
      });
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      // Act
      final signInFuture = authProvider.signIn('test@example.com', 'password123');
      
      // Assert - check loading state during operation
      await Future.delayed(Duration(milliseconds: 10));
      expect(authProvider.isLoading, true);
      
      await signInFuture;
      expect(authProvider.isLoading, false);
    });

    test('signOut should clear user and set state to unauthenticated', () async {
      // Arrange - first sign in
      final mockUser = createMockUser('test-user-id', 'test@example.com');
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            idToken: 'id-token',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);
      await authProvider.signIn('test@example.com', 'password123');
      
      when(mockAuthService.signOut()).thenAnswer((_) async => {});

      // Act
      await authProvider.signOut();

      // Assert
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, null);
      expect(authProvider.error, null);
      expect(authProvider.isLoading, false);
    });

    test('signOut should handle errors gracefully', () async {
      // Arrange
      when(mockAuthService.signOut()).thenThrow(Exception('Sign out failed'));

      // Act
      await authProvider.signOut();

      // Assert
      expect(authProvider.error, isNotNull);
      expect(authProvider.isLoading, false);
    });

    test('register success should authenticate user automatically', () async {
      // Arrange
      final mockUser = createMockUser('new-user-id', 'newuser@example.com');
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async => {});
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            idToken: 'id-token',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      // Act
      final result = await authProvider.register(
        'newuser@example.com',
        'password123',
        name: 'New User',
      );

      // Assert
      expect(result, true);
      expect(authProvider.isAuthenticated, true);
      expect(authProvider.currentUser, mockUser);
      expect(authProvider.error, null);
      expect(authProvider.isLoading, false);
      
      verify(mockAuthService.register('newuser@example.com', 'password123', name: 'New User')).called(1);
      verify(mockAuthService.signIn('newuser@example.com', 'password123')).called(1);
    });

    test('register failure should set error and remain unauthenticated', () async {
      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenThrow(Exception('An account with this email already exists'));

      // Act
      final result = await authProvider.register(
        'existing@example.com',
        'password123',
      );

      // Assert
      expect(result, false);
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, null);
      expect(authProvider.error, 'An account with this email already exists');
      expect(authProvider.isLoading, false);
    });

    test('register should set loading state during operation', () async {
      // Arrange
      final mockUser = createMockUser('new-user-id', 'newuser@example.com');
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async {
        await Future.delayed(Duration(milliseconds: 100));
      });
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            idToken: 'id-token',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      // Act
      final registerFuture = authProvider.register('newuser@example.com', 'password123');
      
      // Assert - check loading state during operation
      await Future.delayed(Duration(milliseconds: 10));
      expect(authProvider.isLoading, true);
      
      await registerFuture;
      expect(authProvider.isLoading, false);
    });

    test('clearError should remove error message', () async {
      // Arrange - create an error state
      when(mockAuthService.signIn(any, any))
          .thenThrow(Exception('Invalid credentials'));
      await authProvider.signIn('test@example.com', 'wrongpassword');
      expect(authProvider.error, isNotNull);

      // Act
      authProvider.clearError();

      // Assert
      expect(authProvider.error, null);
    });

    test('error messages should strip "Exception: " prefix', () async {
      // Arrange
      when(mockAuthService.signIn(any, any))
          .thenThrow(Exception('Exception: Network error'));

      // Act
      await authProvider.signIn('test@example.com', 'password123');

      // Assert
      expect(authProvider.error, 'Network error');
      expect(authProvider.error, isNot(contains('Exception: ')));
    });

    test('multiple sign-in attempts should update state correctly', () async {
      // Arrange
      final mockUser = createMockUser('test-user-id', 'test@example.com');
      
      // First attempt fails
      when(mockAuthService.signIn('test@example.com', 'wrongpassword'))
          .thenThrow(Exception('Invalid password'));
      
      // Second attempt succeeds
      when(mockAuthService.signIn('test@example.com', 'correctpassword'))
          .thenAnswer((_) async => AuthTokens(
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                idToken: 'id-token',
                expiresIn: 3600,
              ));
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      // Act - first attempt
      final result1 = await authProvider.signIn('test@example.com', 'wrongpassword');
      expect(result1, false);
      expect(authProvider.error, 'Invalid password');
      expect(authProvider.isAuthenticated, false);

      // Act - second attempt
      final result2 = await authProvider.signIn('test@example.com', 'correctpassword');
      expect(result2, true);
      expect(authProvider.error, null);
      expect(authProvider.isAuthenticated, true);
      expect(authProvider.currentUser, mockUser);
    });

    test('state changes should notify listeners', () async {
      // Arrange
      int notificationCount = 0;
      authProvider.addListener(() {
        notificationCount++;
      });

      final mockUser = createMockUser('test-user-id', 'test@example.com');
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            idToken: 'id-token',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      // Act
      await authProvider.signIn('test@example.com', 'password123');

      // Assert - should notify at least twice (loading start and completion)
      expect(notificationCount, greaterThanOrEqualTo(2));
    });
  });
}
