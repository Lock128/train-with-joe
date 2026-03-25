import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kiri_check/kiri_check.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:provider/provider.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:train_with_joe/screens/subscription_screen.dart';
import 'package:train_with_joe/providers/subscription_provider.dart';
import 'package:train_with_joe/providers/auth_provider.dart' as app;
import 'package:train_with_joe/services/api_service.dart';
import 'package:train_with_joe/services/payment_service.dart';
import 'package:train_with_joe/services/auth_service.dart';

@GenerateMocks([ApiService, PaymentService, AuthService])
import 'payment_completion_ui_update.property.test.mocks.dart';

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

/// **Validates: Requirements 19.7**
/// 
/// Property 28: Payment Completion UI Update
/// 
/// For any payment completion callback (success or failure), the Flutter frontend 
/// SHALL update the subscription status display to reflect the new state within 
/// 2 seconds of receiving the callback.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Property 28: Payment Completion UI Update', () {
    // Property test 1: Subscription provider updates within 2 seconds for successful callbacks
    property('Subscription provider updates within 2 seconds for successful callbacks', () {
      forAll(
        combine2(
          constantFrom([
            PaymentProvider.stripe,
            PaymentProvider.appleAppStore,
            PaymentProvider.googlePlayStore,
          ]),
          constantFrom([
            'basic-monthly',
            'pro-monthly',
            'enterprise-monthly',
          ]),
        ),
        (tuple) async {
          final provider = tuple.$1;
          final planId = tuple.$2;

          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();
          final mockAuthService = MockAuthService();

          // Create mock auth user
          final mockUser = MockAuthUser(
            userId: 'test-user-123',
            username: 'test@example.com',
          );

          // Mock auth state
          when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
          when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

          final authProvider = app.AuthProvider(authService: mockAuthService);

          // Mock platform detection
          when(mockPaymentService.detectPlatform()).thenReturn(provider);

          // Mock subscription query - initially no subscription
          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': null,
              });

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );
          subscriptionProvider.updateAuth(authProvider);

          // Record start time
          final startTime = DateTime.now();

          // Simulate payment callback with successful subscription
          final successfulSubscription = {
            'id': 'sub-123',
            'userId': 'test-user-123',
            'provider': provider.name.toUpperCase(),
            'status': 'ACTIVE',
            'planId': planId,
            'currentPeriodEnd': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
          };

          // Update mock to return successful subscription
          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': successfulSubscription,
              });

          // Trigger callback by calling loadSubscription
          await subscriptionProvider.loadSubscription();

          // Calculate elapsed time
          final elapsedTime = DateTime.now().difference(startTime);

          // Verify update completed within 2 seconds
          expect(
            elapsedTime.inSeconds,
            lessThanOrEqualTo(2),
            reason: 'Provider should update within 2 seconds of payment callback',
          );

          // Verify subscription state was updated
          expect(
            subscriptionProvider.subscription,
            isNotNull,
            reason: 'Subscription should be set after callback',
          );

          expect(
            subscriptionProvider.subscription!['status'],
            equals('ACTIVE'),
            reason: 'Subscription status should be ACTIVE after successful payment',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 2: Subscription provider updates within 2 seconds for failed payment callbacks
    property('Subscription provider updates within 2 seconds for failed payment callbacks', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'pro-monthly',
          'enterprise-monthly',
        ]),
        (planId) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();
          final mockAuthService = MockAuthService();

          final mockUser = MockAuthUser(
            userId: 'test-user-123',
            username: 'test@example.com',
          );

          when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
          when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

          final authProvider = app.AuthProvider(authService: mockAuthService);

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          // Mock subscription query - initially no subscription
          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': null,
              });

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );
          subscriptionProvider.updateAuth(authProvider);

          final startTime = DateTime.now();

          // Simulate failed payment callback - subscription remains null
          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': null,
              });

          // Trigger callback
          await subscriptionProvider.loadSubscription();

          final elapsedTime = DateTime.now().difference(startTime);

          // Verify update completed within 2 seconds
          expect(
            elapsedTime.inSeconds,
            lessThanOrEqualTo(2),
            reason: 'Provider should update within 2 seconds even for failed payments',
          );

          // Verify subscription remains null
          expect(
            subscriptionProvider.subscription,
            isNull,
            reason: 'Subscription should remain null after failed payment',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 3: Mobile payment callbacks update provider within 2 seconds
    property('Mobile payment callbacks update provider within 2 seconds', () {
      forAll(
        combine2(
          constantFrom([
            PaymentProvider.appleAppStore,
            PaymentProvider.googlePlayStore,
          ]),
          constantFrom([
            'basic-monthly',
            'pro-monthly',
          ]),
        ),
        (tuple) async {
          final provider = tuple.$1;
          final planId = tuple.$2;

          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();
          final mockAuthService = MockAuthService();

          final mockUser = MockAuthUser(
            userId: 'test-user-123',
            username: 'test@example.com',
          );

          when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
          when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

          final authProvider = app.AuthProvider(authService: mockAuthService);

          when(mockPaymentService.detectPlatform()).thenReturn(provider);

          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': null,
              });

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );
          subscriptionProvider.updateAuth(authProvider);

          final startTime = DateTime.now();

          // Simulate mobile payment callback
          final mobileSubscription = {
            'id': 'sub-mobile-123',
            'userId': 'test-user-123',
            'provider': provider.name.toUpperCase(),
            'status': 'ACTIVE',
            'planId': planId,
            'currentPeriodEnd': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
          };

          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': mobileSubscription,
              });

          await subscriptionProvider.loadSubscription();

          final elapsedTime = DateTime.now().difference(startTime);

          expect(
            elapsedTime.inSeconds,
            lessThanOrEqualTo(2),
            reason: 'Mobile payment callbacks should update provider within 2 seconds',
          );

          expect(
            subscriptionProvider.subscription!['provider'],
            equals(provider.name.toUpperCase()),
            reason: 'Provider should match mobile platform',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 4: Subscription status changes are reflected within 2 seconds
    property('Subscription status changes are reflected within 2 seconds', () {
      forAll(
        constantFrom([
          'ACTIVE',
          'INACTIVE',
          'CANCELLED',
          'PAST_DUE',
        ]),
        (status) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();
          final mockAuthService = MockAuthService();

          final mockUser = MockAuthUser(
            userId: 'test-user-123',
            username: 'test@example.com',
          );

          when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
          when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

          final authProvider = app.AuthProvider(authService: mockAuthService);

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );
          subscriptionProvider.updateAuth(authProvider);

          final startTime = DateTime.now();

          // Simulate subscription with specific status
          final subscription = {
            'id': 'sub-123',
            'userId': 'test-user-123',
            'provider': 'STRIPE',
            'status': status,
            'planId': 'basic-monthly',
          };

          when(mockApiService.query(any)).thenAnswer((_) async => {
                'getSubscriptionStatus': subscription,
              });

          await subscriptionProvider.loadSubscription();

          final elapsedTime = DateTime.now().difference(startTime);

          expect(
            elapsedTime.inSeconds,
            lessThanOrEqualTo(2),
            reason: 'Status changes should update provider within 2 seconds',
          );

          expect(
            subscriptionProvider.subscription!['status'],
            equals(status),
            reason: 'Subscription status should match callback data',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 5: Multiple rapid callbacks update provider correctly
    property('Multiple rapid callbacks update provider correctly within 2 seconds', () {
      forAll(
        constantFrom([2, 3, 4, 5]),
        (callbackCount) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();
          final mockAuthService = MockAuthService();

          final mockUser = MockAuthUser(
            userId: 'test-user-123',
            username: 'test@example.com',
          );

          when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
          when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

          final authProvider = app.AuthProvider(authService: mockAuthService);

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );
          subscriptionProvider.updateAuth(authProvider);

          final startTime = DateTime.now();

          // Simulate multiple rapid callbacks
          for (int i = 0; i < callbackCount; i++) {
            final subscription = {
              'id': 'sub-$i',
              'userId': 'test-user-123',
              'provider': 'STRIPE',
              'status': 'ACTIVE',
              'planId': 'basic-monthly',
            };

            when(mockApiService.query(any)).thenAnswer((_) async => {
                  'getSubscriptionStatus': subscription,
                });

            await subscriptionProvider.loadSubscription();
          }

          final elapsedTime = DateTime.now().difference(startTime);

          expect(
            elapsedTime.inSeconds,
            lessThanOrEqualTo(2),
            reason: 'Multiple callbacks should complete within 2 seconds',
          );

          expect(
            subscriptionProvider.subscription,
            isNotNull,
            reason: 'Final subscription state should be set',
          );
        },
        maxExamples: 100,
      );
    });

    // Unit test 1: Verify subscription provider notifies listeners on update
    test('Subscription provider notifies listeners on update', () async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();
      final mockAuthService = MockAuthService();

      final mockUser = MockAuthUser(
        userId: 'test-user-123',
        username: 'test@example.com',
      );

      when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      final authProvider = app.AuthProvider(authService: mockAuthService);

      final subscription = {
        'id': 'sub-123',
        'userId': 'test-user-123',
        'provider': 'STRIPE',
        'status': 'ACTIVE',
        'planId': 'basic-monthly',
      };

      when(mockApiService.query(any)).thenAnswer((_) async => {
            'getSubscriptionStatus': subscription,
          });

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );
      subscriptionProvider.updateAuth(authProvider);

      bool notified = false;
      subscriptionProvider.addListener(() {
        notified = true;
      });

      await subscriptionProvider.loadSubscription();

      expect(
        notified,
        isTrue,
        reason: 'Provider should notify listeners when subscription updates',
      );
    });

    // Unit test 2: Verify loading state is managed correctly
    test('Loading state is managed correctly during callback', () async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();
      final mockAuthService = MockAuthService();

      final mockUser = MockAuthUser(
        userId: 'test-user-123',
        username: 'test@example.com',
      );

      when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      final authProvider = app.AuthProvider(authService: mockAuthService);

      when(mockApiService.query(any)).thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
        return {
          'getSubscriptionStatus': {
            'id': 'sub-123',
            'status': 'ACTIVE',
          },
        };
      });

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );
      subscriptionProvider.updateAuth(authProvider);

      expect(subscriptionProvider.isLoading, isFalse);

      final loadFuture = subscriptionProvider.loadSubscription();

      // Should be loading immediately after call
      expect(subscriptionProvider.isLoading, isTrue);

      await loadFuture;

      // Should not be loading after completion
      expect(subscriptionProvider.isLoading, isFalse);
    });

    // Unit test 3: Verify error state is cleared on successful callback
    test('Error state is cleared on successful callback', () async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();
      final mockAuthService = MockAuthService();

      final mockUser = MockAuthUser(
        userId: 'test-user-123',
        username: 'test@example.com',
      );

      when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      final authProvider = app.AuthProvider(authService: mockAuthService);

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );
      subscriptionProvider.updateAuth(authProvider);

      // First call fails
      when(mockApiService.query(any)).thenThrow(Exception('Network error'));
      await subscriptionProvider.loadSubscription();
      expect(subscriptionProvider.error, isNotNull);

      // Second call succeeds
      when(mockApiService.query(any)).thenAnswer((_) async => {
            'getSubscriptionStatus': {
              'id': 'sub-123',
              'status': 'ACTIVE',
            },
          });
      await subscriptionProvider.loadSubscription();

      expect(
        subscriptionProvider.error,
        isNull,
        reason: 'Error should be cleared on successful callback',
      );
    });

    // Unit test 4: Verify subscription screen handles null subscription
    testWidgets('Subscription screen handles null subscription', (WidgetTester tester) async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();
      final mockAuthService = MockAuthService();

      final mockUser = MockAuthUser(
        userId: 'test-user-123',
        username: 'test@example.com',
      );

      when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      final authProvider = app.AuthProvider(authService: mockAuthService);

      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);

      when(mockApiService.query(any)).thenAnswer((_) async => {
            'getSubscriptionStatus': null,
          });

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );
      subscriptionProvider.updateAuth(authProvider);

      await tester.pumpWidget(
        MaterialApp(
          home: MultiProvider(
            providers: [
              ChangeNotifierProvider<SubscriptionProvider>.value(
                value: subscriptionProvider,
              ),
              ChangeNotifierProvider<app.AuthProvider>.value(
                value: authProvider,
              ),
            ],
            child: const SubscriptionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(
        find.text('Choose a Plan'),
        findsOneWidget,
        reason: 'Should show plan selection when no subscription',
      );
    });

    // Unit test 5: Verify subscription screen shows active subscription
    testWidgets('Subscription screen shows active subscription', (WidgetTester tester) async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();
      final mockAuthService = MockAuthService();

      final mockUser = MockAuthUser(
        userId: 'test-user-123',
        username: 'test@example.com',
      );

      when(mockAuthService.isUserSignedIn()).thenAnswer((_) async => true);
      when(mockAuthService.getCurrentUser()).thenAnswer((_) async => mockUser);

      final authProvider = app.AuthProvider(authService: mockAuthService);

      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);

      final subscription = {
        'id': 'sub-123',
        'userId': 'test-user-123',
        'provider': 'STRIPE',
        'status': 'ACTIVE',
        'planId': 'basic-monthly',
      };

      when(mockApiService.query(any)).thenAnswer((_) async => {
            'getSubscriptionStatus': subscription,
          });

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );
      subscriptionProvider.updateAuth(authProvider);

      await tester.pumpWidget(
        MaterialApp(
          home: MultiProvider(
            providers: [
              ChangeNotifierProvider<SubscriptionProvider>.value(
                value: subscriptionProvider,
              ),
              ChangeNotifierProvider<app.AuthProvider>.value(
                value: authProvider,
              ),
            ],
            child: const SubscriptionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(
        find.text('Active Subscription'),
        findsOneWidget,
        reason: 'Should show active subscription status',
      );
    });
  });
}
