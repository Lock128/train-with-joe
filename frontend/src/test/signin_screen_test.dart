import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:train_with_joe/screens/signin_screen.dart';
import 'package:train_with_joe/providers/auth_provider.dart' as app;
import 'package:train_with_joe/services/auth_service.dart';
import 'package:train_with_joe/l10n/generated/app_localizations.dart';

import 'signin_screen_test.mocks.dart';

// Mock implementations
class _MockSignInDetails extends SignInDetails {
  const _MockSignInDetails();
  @override
  Map<String, Object?> toJson() => {};
}

class MockAuthUser extends AuthUser {
  MockAuthUser({required super.username, required super.userId})
      : super(signInDetails: const _MockSignInDetails());
}

/// Helper to create a successful SignInResult for mocking.
SignInResult mockSignInResultDone() => const SignInResult(
      isSignedIn: true,
      nextStep: AuthNextSignInStep(signInStep: AuthSignInStep.done),
    );

@GenerateMocks([AuthService, GoRouter])
void main() {
  late MockAuthService mockAuthService;
  late app.AuthProvider authProvider;

  setUp(() {
    mockAuthService = MockAuthService();
    when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => false);
    authProvider = app.AuthProvider(authService: mockAuthService);
  });

  /// Helper to create widget with providers and routing
  Widget createTestWidget(Widget child, {GoRouter? router}) {
    final testRouter = router ?? GoRouter(
      initialLocation: '/signin',
      routes: [
        GoRoute(
          path: '/signin',
          builder: (context, state) => child,
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const Scaffold(body: Text('Register Screen')),
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
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    );
  }

  group('SignInScreen Widget Tests - Requirements 11.6, 11.7', () {
    testWidgets('should render all UI elements', (tester) async {
      // Act
      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Welcome Back'), findsOneWidget);
      expect(find.text('Sign in to your account'), findsOneWidget);
      expect(find.byIcon(Icons.auto_stories), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(2)); // Email and password
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Sign In'), findsOneWidget);
      expect(find.text("Don't have an account? Register"), findsOneWidget);
    });

    testWidgets('should show validation error for empty email', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Act - tap sign in without entering email
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Please enter your email'), findsOneWidget);
    });

    testWidgets('should show validation error for invalid email', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Act - enter invalid email
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'invalidemail',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Please enter a valid email'), findsOneWidget);
    });

    testWidgets('should show validation error for empty password', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Act - enter email but no password
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Please enter your password'), findsOneWidget);
    });

    testWidgets('should toggle password visibility', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Initially visibility icon should show "visibility_outlined" (password is hidden)
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
      expect(find.byIcon(Icons.visibility_off_outlined), findsNothing);

      // Act - tap visibility toggle
      await tester.tap(find.byIcon(Icons.visibility_outlined));
      await tester.pumpAndSettle();

      // Assert - icon should change to "visibility_off_outlined" (password is visible)
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
      expect(find.byIcon(Icons.visibility_outlined), findsNothing);

      // Act - tap again to hide
      await tester.tap(find.byIcon(Icons.visibility_off_outlined));
      await tester.pumpAndSettle();

      // Assert - icon should change back to "visibility_outlined" (password is hidden)
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
      expect(find.byIcon(Icons.visibility_off_outlined), findsNothing);
    });

    testWidgets('should call signIn on valid form submission', (tester) async {
      // Arrange
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => mockSignInResultDone());
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Act - enter valid credentials
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert
      verify(mockAuthService.signIn('test@example.com', 'password123')).called(1);
    });

    testWidgets('should display error message on sign in failure', (tester) async {
      // Arrange
      when(mockAuthService.signIn(any, any))
          .thenThrow(Exception('Invalid email or password'));

      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Act - enter credentials and submit
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'test@example.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'wrongpassword',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Invalid email or password'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('should show loading indicator during sign in', (tester) async {
      // Arrange
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
        return mockSignInResultDone();
      });
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const SignInScreen()));
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
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump(const Duration(milliseconds: 10));

      // Assert - loading indicator should be visible
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Wait for completion
      await tester.pumpAndSettle();
    });

    testWidgets('should disable form fields during loading', (tester) async {
      // Arrange
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
        return mockSignInResultDone();
      });
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const SignInScreen()));
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
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump(const Duration(milliseconds: 10));

      // Assert - fields should be disabled
      final emailField = tester.widget<TextFormField>(
        find.widgetWithText(TextFormField, 'Email'),
      );
      final passwordField = tester.widget<TextFormField>(
        find.widgetWithText(TextFormField, 'Password'),
      );
      expect(emailField.enabled, false);
      expect(passwordField.enabled, false);
      
      // Wait for completion
      await tester.pumpAndSettle();
    });

    testWidgets('should trim email input', (tester) async {
      // Arrange
      when(mockAuthService.signIn(any, any)).thenAnswer((_) async => mockSignInResultDone());
      when(mockAuthService.getCurrentUser()).thenAnswer(
        (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
      );

      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Act - enter email with spaces
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        '  test@example.com  ',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert - email should be trimmed
      verify(mockAuthService.signIn('test@example.com', 'password123')).called(1);
    });

    testWidgets('should have accessible labels and tooltips', (tester) async {
      // Arrange
      await tester.pumpWidget(createTestWidget(const SignInScreen()));
      await tester.pumpAndSettle();

      // Assert - check for accessibility
      expect(find.byIcon(Icons.email_outlined), findsOneWidget);
      expect(find.byIcon(Icons.lock_outlined), findsOneWidget);
      
      // Check form field labels
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
    });

    testWidgets('should display error in red container with icon', (tester) async {
      // Arrange
      when(mockAuthService.signIn(any, any))
          .thenThrow(Exception('Network error'));

      await tester.pumpWidget(createTestWidget(const SignInScreen()));
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
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle();

      // Assert - error should be in styled container
      expect(find.text('Network error'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      
      // Find the error container
      final container = find.ancestor(
        of: find.text('Network error'),
        matching: find.byType(Container),
      );
      expect(container, findsOneWidget);
    });
  });
}
