import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:train_with_joe/screens/register_screen.dart';
import 'package:train_with_joe/providers/auth_provider.dart' as app;
import 'package:train_with_joe/services/auth_service.dart';

import 'register_screen_test.mocks.dart';

// Mock implementations
class MockAuthUser implements AuthUser {
  @override
  final String username;

  @override
  final String userId;

  MockAuthUser({required this.username, required this.userId});

  @override
  List<AuthUserAttribute> get userAttributes => [];

  @override
  SignInDetails get signInDetails => throw UnimplementedError();

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
  late MockAuthService mockAuthService;
  late app.AuthProvider authProvider;

  setUp(() {
    mockAuthService = MockAuthService();
    when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => false);
    authProvider = app.AuthProvider(authService: mockAuthService);
  });

  /// Helper to create widget with providers
  Widget createTestWidget(Widget child) {
    final testRouter = GoRouter(
      initialLocation: '/register',
      routes: [
        GoRoute(
          path: '/register',
          builder: (context, state) => child,
        ),
        GoRoute(
          path: '/signin',
          builder: (context, state) => const Scaffold(body: Text('Sign In Screen')),
        ),
        GoRoute(
          path: '/home',
          builder: (context, state) => const Scaffold(body: Text('Home Screen')),
        ),
      ],
    );

    return ChangeNotifierProvider<app.AuthProvider>.value(
      value: authProvider,
      child: MaterialApp.router(
        routerConfig: testRouter,
      ),
    );
  }

  group('RegisterScreen Widget Tests - Requirements 11.6, 11.7', () {
    testWidgets('should render all UI elements', (tester) async {
      // Set larger viewport to accommodate all form fields
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Act
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Create Account'), findsOneWidget);
      expect(find.text('Sign up to get started'), findsOneWidget);
      expect(find.byIcon(Icons.rocket_launch), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(4)); // Name, email, password, confirm
      expect(find.text('Name (optional)'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Register'), findsOneWidget);
      expect(find.text('Already have an account? Sign In'), findsOneWidget);
    });

    testWidgets('should show validation error for empty email', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - tap register without entering email
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Please enter your email'), findsOneWidget);
    });

    testWidgets('should show validation error for invalid email', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - enter invalid email
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'invalidemail',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Please enter a valid email'), findsOneWidget);
    });

    testWidgets('should show validation error for empty password', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - enter email but no password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Please enter a password'), findsOneWidget);
    });

    testWidgets('should show validation error for short password', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - enter short password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'short',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Password must be at least 8 characters'), findsOneWidget);
    });

    testWidgets('should show validation error for mismatched passwords', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - enter mismatched passwords
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'different123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Passwords do not match'), findsOneWidget);
    });

    testWidgets('should toggle password visibility', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Initially both password fields should show visibility_outlined icons
      expect(find.byIcon(Icons.visibility_outlined), findsNWidgets(2));

      // Act - tap visibility toggle for password field (first one)
      final visibilityIcons = find.byIcon(Icons.visibility_outlined);
      await tester.tap(visibilityIcons.first);
      await tester.pumpAndSettle();

      // Assert - one icon should change to visibility_off_outlined
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    });

    testWidgets('should toggle confirm password visibility', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Initially both password fields should show visibility_outlined icons
      expect(find.byIcon(Icons.visibility_outlined), findsNWidgets(2));

      // Act - tap visibility toggle for confirm password (second one)
      final visibilityIcons = find.byIcon(Icons.visibility_outlined);
      await tester.tap(visibilityIcons.last);
      await tester.pumpAndSettle();

      // Assert - one icon should change to visibility_off_outlined
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    });

    testWidgets('should call register on valid form submission', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async => {});
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'token',
            refreshToken: 'refresh',
            idToken: 'id',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - enter valid registration data
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Name (optional)'),
        'Test User',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      verify(mockAuthService.register('test@example.com', 'password123', name: 'Test User'))
          .called(1);
    });

    testWidgets('should register without name if not provided', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async => {});
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'token',
            refreshToken: 'refresh',
            idToken: 'id',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - register without name
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert - name should be null
      verify(mockAuthService.register('test@example.com', 'password123', name: null))
          .called(1);
    });

    testWidgets('should display error message on registration failure', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenThrow(Exception('An account with this email already exists'));

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - submit registration
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'existing@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('An account with this email already exists'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('should show loading indicator during registration', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
      });
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'token',
            refreshToken: 'refresh',
            idToken: 'id',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - submit form
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pump(const Duration(milliseconds: 10));

      // Assert - loading indicator should be visible
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Wait for completion
      await tester.pumpAndSettle();
    });

    testWidgets('should disable form fields during loading', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
      });
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'token',
            refreshToken: 'refresh',
            idToken: 'id',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - submit form
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pump(const Duration(milliseconds: 10));

      // Assert - fields should be disabled
      final emailField = tester.widget<TextFormField>(
        find.widgetWithText(TextFormField, 'Email'),
      );
      expect(emailField.enabled, false);
      
      // Wait for completion
      await tester.pumpAndSettle();
    });

    testWidgets('should trim email and name inputs', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenAnswer((_) async => {});
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
            accessToken: 'token',
            refreshToken: 'refresh',
            idToken: 'id',
            expiresIn: 3600,
          ));
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act - enter data with spaces
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Name (optional)'),
        '  Test User  ',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        '  test@example.com  ',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert - inputs should be trimmed
      verify(mockAuthService.register('test@example.com', 'password123', name: 'Test User'))
          .called(1);
    });

    testWidgets('should show password helper text', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Minimum 8 characters'), findsOneWidget);
    });

    testWidgets('should have accessible labels and icons', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Assert - check for accessibility
      expect(find.byIcon(Icons.person_outlined), findsOneWidget);
      expect(find.byIcon(Icons.email_outlined), findsOneWidget);
      expect(find.byIcon(Icons.lock_outlined), findsNWidgets(2)); // Password and confirm
    });

    testWidgets('should display error in red container with icon', (tester) async {
      // Set larger viewport
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      // Arrange
      when(mockAuthService.register(any, any, name: anyNamed('name')))
          .thenThrow(Exception('Registration failed'));

      await tester.pumpWidget(createTestWidget(const RegisterScreen()));
      await tester.pumpAndSettle();

      // Act
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Register'));
      await tester.pumpAndSettle();

      // Assert - error should be in styled container
      expect(find.text('Registration failed'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
  });
}
