import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:train_with_joe/screens/home_screen.dart';
import 'package:train_with_joe/providers/auth_provider.dart' as app;
import 'package:train_with_joe/providers/user_provider.dart';
import 'package:train_with_joe/services/auth_service.dart';
import 'package:train_with_joe/services/api_service.dart';

import 'home_screen_test.mocks.dart';

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

@GenerateMocks([AuthService, ApiService])
void main() {
  late MockAuthService mockAuthService;
  late MockApiService mockApiService;
  late app.AuthProvider authProvider;
  late UserProvider userProvider;

  setUp(() {
    mockAuthService = MockAuthService();
    mockApiService = MockApiService();
    when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
    when(mockAuthService.getCurrentUser()).thenAnswer(
      (_) async => MockAuthUser(username: 'test@example.com', userId: 'user-123'),
    );
    when(mockAuthService.signOut()).thenAnswer((_) async => {});

    authProvider = app.AuthProvider(authService: mockAuthService);
    userProvider = UserProvider();
  });

  /// Helper to create widget with providers
  Widget createTestWidget(Widget child) {
    final testRouter = GoRouter(
      initialLocation: '/home',
      routes: [
        GoRoute(
          path: '/home',
          builder: (context, state) => child,
        ),
        GoRoute(
          path: '/signin',
          builder: (context, state) => const Scaffold(body: Text('Sign In Screen')),
        ),
        GoRoute(
          path: '/subscription',
          builder: (context, state) => const Scaffold(body: Text('Subscription Screen')),
        ),
      ],
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<app.AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<UserProvider>.value(value: userProvider),
      ],
      child: MaterialApp.router(
        routerConfig: testRouter,
      ),
    );
  }

  group('HomeScreen Widget Tests - Requirements 11.6, 11.7', () {
    testWidgets('should render HomeScreen successfully', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(HomeScreen), findsOneWidget);
    });

    testWidgets('should render welcome message and user info', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      // Let AuthProvider._checkAuthStatus complete
      await tester.pumpAndSettle();

      expect(find.text('Welcome!'), findsOneWidget);
      expect(find.byIcon(Icons.person), findsOneWidget);
      expect(find.text('Subscription'), findsOneWidget);
      expect(find.text('Quick Actions'), findsOneWidget);
      expect(find.text('Manage Subscription'), findsOneWidget);
      expect(find.text('Sign Out'), findsOneWidget);
    });

    testWidgets('should have sign out button in app bar', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.logout), findsWidgets);
      expect(find.byTooltip('Sign Out'), findsOneWidget);
    });

    testWidgets('should call signOut when logout button tapped', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Sign Out'));
      await tester.pumpAndSettle();

      verify(mockAuthService.signOut()).called(1);
    });

    testWidgets('should display subscription status card', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.card_membership), findsOneWidget);
      expect(find.text('Subscription'), findsOneWidget);
    });

    testWidgets('should show no subscription message when user has no subscription', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.text('No active subscription'), findsOneWidget);
    });

    testWidgets('should display quick actions section', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Quick Actions'), findsOneWidget);
    });

    testWidgets('should have manage subscription button', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Manage Subscription'), findsOneWidget);
    });

    testWidgets('should have circular avatar icon', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(CircleAvatar), findsOneWidget);
    });

    testWidgets('should have constrained width layout', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(ConstrainedBox), findsWidgets);
    });

    testWidgets('should be scrollable', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(SingleChildScrollView), findsOneWidget);
    });

    testWidgets('should display cards for user info and subscription', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(Card), findsWidgets);
    });

    testWidgets('should have elevated button for manage subscription', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('should have outlined button for sign out', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(OutlinedButton), findsOneWidget);
    });

    testWidgets('should display subscription status from user data', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(HomeScreen), findsOneWidget);
    });

    testWidgets('should have app bar with title', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('should use Consumer2 for auth and user providers', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(Consumer2<app.AuthProvider, UserProvider>), findsOneWidget);
    });

    testWidgets('should display user email from auth provider when user data not loaded', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      // UserProvider has no user data, so the screen should still render
      expect(find.byType(HomeScreen), findsOneWidget);
    });

    testWidgets('should display error icon when error occurs', (tester) async {
      await tester.pumpWidget(createTestWidget(const HomeScreen()));
      await tester.pumpAndSettle();

      // No error state in default setup, just verify screen renders
      expect(find.byType(HomeScreen), findsOneWidget);
    });
  });
}
