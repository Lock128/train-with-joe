import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:train_with_joe/providers/auth_provider.dart' as app;
import 'package:train_with_joe/providers/user_provider.dart';
import 'package:train_with_joe/providers/subscription_provider.dart';
import 'package:train_with_joe/services/auth_service.dart';
import 'package:train_with_joe/screens/signin_screen.dart';
import 'package:train_with_joe/screens/register_screen.dart';
import 'package:train_with_joe/screens/home_screen.dart';
import 'package:train_with_joe/screens/subscription_screen.dart';

import 'routing_test.mocks.dart';

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

// Mock UserProvider that doesn't call API
class MockUserProvider extends UserProvider {
  @override
  Future<void> loadUser() async {
    // Do nothing - don't call API
  }
}

// Mock SubscriptionProvider that doesn't call API
class MockSubscriptionProvider extends SubscriptionProvider {
  @override
  Future<void> loadSubscription() async {
    // Do nothing - don't call API
  }
}

@GenerateMocks([AuthService])
void main() {
  late MockAuthService mockAuthService;
  late app.AuthProvider authProvider;
  late GoRouter router;

  /// Helper to create router with auth provider
  GoRouter createRouterHelper(app.AuthProvider authProvider) {
    return GoRouter(
      initialLocation: authProvider.isAuthenticated ? '/home' : '/signin',
      redirect: (context, state) {
        final isAuthenticated = authProvider.isAuthenticated;
        final isAuthRoute = state.matchedLocation == '/signin' || 
                           state.matchedLocation == '/register';

        // Redirect to home if authenticated and trying to access auth routes
        if (isAuthenticated && isAuthRoute) {
          return '/home';
        }

        // Redirect to signin if not authenticated and trying to access protected routes
        if (!isAuthenticated && !isAuthRoute) {
          return '/signin';
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/signin',
          builder: (context, state) => const SignInScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/home',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/subscription',
          builder: (context, state) => const SubscriptionScreen(),
        ),
      ],
    );
  }

  /// Helper to create widget with providers and routing
  Widget createTestApp() {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<app.AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<UserProvider>(create: (_) => MockUserProvider()),
        ChangeNotifierProvider<SubscriptionProvider>(create: (_) => MockSubscriptionProvider()),
      ],
      child: MaterialApp.router(
        routerConfig: router,
      ),
    );
  }

  setUp(() {
    mockAuthService = MockAuthService();
    when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => false);
    authProvider = app.AuthProvider(authService: mockAuthService);
    router = createRouterHelper(authProvider);
  });

  group('Routing Widget Tests - Requirements 11.6, 11.7', () {
    group('Navigation between screens', () {
      testWidgets('should navigate from signin to register', (tester) async {
        // Arrange
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Assert - should start on signin screen
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text("Don't have an account? Register"), findsOneWidget);

        // Act - tap register link
        await tester.tap(find.text("Don't have an account? Register"));
        await tester.pumpAndSettle();

        // Assert - should navigate to register screen
        expect(find.text('Create Account'), findsOneWidget);
        expect(find.text('Sign up to get started'), findsOneWidget);
      });

      testWidgets('should navigate from register to signin', (tester) async {
        // Arrange - navigate to register screen first
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();
        
        // Navigate to register
        await tester.tap(find.text("Don't have an account? Register"));
        await tester.pumpAndSettle();

        // Assert - should be on register screen
        expect(find.text('Create Account'), findsOneWidget);
        
        // Scroll to bottom to make the sign in link visible
        await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -500));
        await tester.pumpAndSettle();

        // Act - tap signin link
        await tester.tap(find.text('Already have an account? Sign In'));
        await tester.pumpAndSettle();

        // Assert - should navigate to signin screen
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });

      testWidgets('should navigate from home to subscription', (tester) async {
        // Arrange - create authenticated user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Assert - should be on home screen
        expect(find.text('Home'), findsOneWidget);

        // Scroll down to make the Manage Subscription button visible
        await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -200));
        await tester.pumpAndSettle();

        // Act - tap manage subscription button (now an OutlinedButton)
        await tester.tap(find.widgetWithText(OutlinedButton, 'Manage Subscription'));
        await tester.pumpAndSettle();

        // Assert - should navigate to subscription screen
        expect(find.text('Subscription'), findsAtLeastNWidgets(1));
        expect(find.text('Choose a Plan'), findsOneWidget);
      });

      testWidgets('should navigate back from subscription to home', (tester) async {
        // Arrange - create authenticated user and navigate to subscription
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Scroll down to make the Manage Subscription button visible
        await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -200));
        await tester.pumpAndSettle();

        // Navigate to subscription (now an OutlinedButton)
        await tester.tap(find.widgetWithText(OutlinedButton, 'Manage Subscription'));
        await tester.pumpAndSettle();

        // Assert - should be on subscription screen
        expect(find.text('Choose a Plan'), findsOneWidget);

        // Act - navigate back to home using router (back button removed, navigation via shell)
        router.go('/home');
        await tester.pumpAndSettle();

        // Assert - should be back on home screen
        expect(find.text('Home'), findsOneWidget);
      });
    });

    group('Authentication guards', () {
      testWidgets('should redirect unauthenticated user from home to signin', (tester) async {
        // Arrange - unauthenticated user
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to navigate to home
        router.go('/home');
        await tester.pumpAndSettle();

        // Assert - should be redirected to signin
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });

      testWidgets('should redirect unauthenticated user from subscription to signin', (tester) async {
        // Arrange - unauthenticated user
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to navigate to subscription
        router.go('/subscription');
        await tester.pumpAndSettle();

        // Assert - should be redirected to signin
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });

      testWidgets('should allow authenticated user to access home', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Assert - should be on home screen
        expect(find.text('Home'), findsOneWidget);
      });

      testWidgets('should allow authenticated user to access subscription', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - navigate to subscription
        router.go('/subscription');
        await tester.pumpAndSettle();

        // Assert - should be on subscription screen
        expect(find.text('Choose a Plan'), findsOneWidget);
      });

      testWidgets('should redirect authenticated user from signin to home', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to navigate to signin
        router.go('/signin');
        await tester.pumpAndSettle();

        // Assert - should be redirected to home
        expect(find.text('Home'), findsOneWidget);
      });

      testWidgets('should redirect authenticated user from register to home', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to navigate to register
        router.go('/register');
        await tester.pumpAndSettle();

        // Assert - should be redirected to home
        expect(find.text('Home'), findsOneWidget);
      });

      testWidgets('should redirect to signin after signout', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        when(mockAuthService.signOut()).thenAnswer((_) async => {});
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Assert - should be on home screen
        expect(find.text('Home'), findsOneWidget);

        // Act - sign out programmatically (sign out button moved to AppShell navigation)
        await authProvider.signOut();
        await tester.pumpAndSettle();

        // Navigate to trigger redirect
        router.go('/home');
        await tester.pumpAndSettle();

        // Assert - should be redirected to signin
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });
    });

    group('Deep linking', () {
      testWidgets('should handle deep link to signin route', (tester) async {
        // Arrange - unauthenticated user
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - navigate directly to signin via deep link
        router.go('/signin');
        await tester.pumpAndSettle();

        // Assert - should display signin screen
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });

      testWidgets('should handle deep link to register route', (tester) async {
        // Arrange - unauthenticated user
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - navigate directly to register via deep link
        router.go('/register');
        await tester.pumpAndSettle();

        // Assert - should display register screen
        expect(find.text('Create Account'), findsOneWidget);
        expect(find.text('Sign up to get started'), findsOneWidget);
      });

      testWidgets('should handle deep link to home route when authenticated', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - navigate directly to home via deep link
        router.go('/home');
        await tester.pumpAndSettle();

        // Assert - should display home screen
        expect(find.text('Home'), findsOneWidget);
      });

      testWidgets('should handle deep link to subscription route when authenticated', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - navigate directly to subscription via deep link
        router.go('/subscription');
        await tester.pumpAndSettle();

        // Assert - should display subscription screen
        expect(find.text('Choose a Plan'), findsOneWidget);
      });

      testWidgets('should redirect deep link to home when unauthenticated', (tester) async {
        // Arrange - unauthenticated user
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to deep link to home while unauthenticated
        router.go('/home');
        await tester.pumpAndSettle();

        // Assert - should be redirected to signin
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });

      testWidgets('should redirect deep link to subscription when unauthenticated', (tester) async {
        // Arrange - unauthenticated user
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to deep link to subscription while unauthenticated
        router.go('/subscription');
        await tester.pumpAndSettle();

        // Assert - should be redirected to signin
        expect(find.text('Welcome Back'), findsOneWidget);
        expect(find.text('Sign in to your account'), findsOneWidget);
      });

      testWidgets('should redirect deep link to signin when authenticated', (tester) async {
        // Arrange - authenticate user
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );
        
        await authProvider.signIn('test@example.com', 'password123');
        router = createRouterHelper(authProvider);
        
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Act - try to deep link to signin while authenticated
        router.go('/signin');
        await tester.pumpAndSettle();

        // Assert - should be redirected to home
        expect(find.text('Home'), findsOneWidget);
      });

      testWidgets('should maintain route after successful authentication', (tester) async {
        // Arrange - start unauthenticated, try to access subscription
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle();

        // Try to access subscription (should redirect to signin)
        router.go('/subscription');
        await tester.pumpAndSettle();

        // Should be on signin
        expect(find.text('Welcome Back'), findsOneWidget);

        // Act - authenticate
        when(mockAuthService.signIn(any, any)).thenAnswer((_) async => AuthTokens(
              accessToken: 'token',
              refreshToken: 'refresh',
              idToken: 'id',
              expiresIn: 3600,
            ));
        when(mockAuthService.getCurrentUser()).thenAnswer(
          (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
        );

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

        // Assert - should navigate to home after signin (default behavior)
        expect(find.text('Home'), findsOneWidget);
      });
    });
  });
}
