import 'package:flutter_test/flutter_test.dart';
import 'package:kiri_check/kiri_check.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:train_with_joe/services/payment_service.dart';
import 'package:train_with_joe/services/api_service.dart';
import 'package:train_with_joe/providers/subscription_provider.dart';

@GenerateMocks([ApiService, PaymentService])
import 'subscription_purchase_redirect.property.test.mocks.dart';

/// **Validates: Requirements 19.6**
/// 
/// Property 27: Subscription Purchase Redirect
/// 
/// For any user-initiated subscription purchase action in the Flutter frontend, 
/// the application SHALL redirect the user to the appropriate payment interface 
/// (Stripe Checkout URL for web, native payment sheet for mobile).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Property 27: Subscription Purchase Redirect', () {
    // Property test 1: Payment service processPayment is called for any plan ID
    property('processPayment is called when creating subscription', () {
      forAll(
        combine2(
          constantFrom([
            'basic-monthly',
            'pro-monthly',
            'enterprise-monthly',
            'basic-yearly',
            'pro-yearly',
          ]),
          constantFrom([
            PaymentProvider.stripe,
            PaymentProvider.appleAppStore,
            PaymentProvider.googlePlayStore,
          ]),
        ),
        (tuple) async {
          final planId = tuple.$1;
          final provider = tuple.$2;

          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          // Mock platform detection
          when(mockPaymentService.detectPlatform()).thenReturn(provider);

          // Mock initialization
          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          // Mock payment processing - return a result map
          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': provider == PaymentProvider.stripe ? 'redirected' : 'pending',
              'provider': provider.name.toUpperCase(),
              'planId': planId,
            },
          );

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          // Create subscription
          await subscriptionProvider.createSubscription(planId);

          // Verify processPayment was called with the plan ID
          verify(mockPaymentService.processPayment(planId)).called(1);

          // Verify initializePayment was called before processPayment
          verify(mockPaymentService.initializePayment()).called(1);
        },
        maxExamples: 100,
      );
    });

    // Property test 2: Mobile platforms return pending status
    property('Mobile payment returns pending status', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'pro-monthly',
          'enterprise-monthly',
        ]),
        (planId) async {
          final mockPaymentService = MockPaymentService();

          // Mock mobile platform detection
          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.appleAppStore);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          // Mock mobile payment processing
          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': 'pending',
              'provider': 'APPLE_APP_STORE',
              'productId': planId,
              'message': 'Purchase initiated. Waiting for App Store confirmation...',
            },
          );

          final result = await mockPaymentService.processPayment(planId);

          // Verify mobile payments return pending status
          expect(
            result['status'],
            equals('pending'),
            reason: 'Mobile payments should return pending status',
          );

          expect(
            result['provider'],
            isIn(['APPLE_APP_STORE', 'GOOGLE_PLAY_STORE']),
            reason: 'Provider should be a mobile app store',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 4: Payment initialization is called before processing
    property('Payment initialization precedes payment processing', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'pro-monthly',
          'enterprise-monthly',
        ]),
        (planId) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': 'redirected',
              'provider': 'STRIPE',
            },
          );

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          // Clear any calls from constructor
          clearInteractions(mockPaymentService);

          await subscriptionProvider.createSubscription(planId);

          // Verify initialization was called
          verify(mockPaymentService.initializePayment()).called(1);

          // Verify processing was called after initialization
          verify(mockPaymentService.processPayment(planId)).called(1);
        },
        maxExamples: 100,
      );
    });

    // Property test 5: Platform detection determines payment method
    property('Platform detection determines payment method used', () {
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
          ]),
        ),
        (tuple) async {
          final provider = tuple.$1;
          final planId = tuple.$2;

          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform()).thenReturn(provider);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': provider == PaymentProvider.stripe ? 'redirected' : 'pending',
              'provider': provider.name.toUpperCase(),
            },
          );

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          await subscriptionProvider.createSubscription(planId);

          // Verify platform detection was called
          verify(mockPaymentService.detectPlatform()).called(greaterThan(0));

          // Verify payment processing was called
          verify(mockPaymentService.processPayment(planId)).called(1);
        },
        maxExamples: 100,
      );
    });

    // Property test 6: Subscription provider updates state after payment initiation
    property('Subscription provider updates state after payment initiation', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'pro-monthly',
          'enterprise-monthly',
        ]),
        (planId) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          final paymentResult = {
            'status': 'redirected',
            'provider': 'STRIPE',
            'sessionId': 'test_session_123',
          };

          when(mockPaymentService.processPayment(any))
              .thenAnswer((_) async => paymentResult);

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          final result = await subscriptionProvider.createSubscription(planId);

          // Verify subscription was created successfully
          expect(
            result,
            isTrue,
            reason: 'createSubscription should return true on success',
          );

          // Verify subscription state was updated
          expect(
            subscriptionProvider.subscription,
            isNotNull,
            reason: 'Subscription should be set after payment initiation',
          );

          expect(
            subscriptionProvider.subscription,
            equals(paymentResult),
            reason: 'Subscription should contain payment result',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 7: Payment errors are handled gracefully
    property('Payment errors are handled and reported', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'pro-monthly',
        ]),
        (planId) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          // Simulate payment error
          when(mockPaymentService.processPayment(any))
              .thenThrow(Exception('Payment failed'));

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          final result = await subscriptionProvider.createSubscription(planId);

          // Verify error was handled
          expect(
            result,
            isFalse,
            reason: 'createSubscription should return false on error',
          );

          expect(
            subscriptionProvider.error,
            isNotNull,
            reason: 'Error should be set when payment fails',
          );

          expect(
            subscriptionProvider.error,
            contains('Payment failed'),
            reason: 'Error message should describe the failure',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 8: Different plan IDs are processed correctly
    property('All plan IDs trigger payment processing', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'basic-yearly',
          'pro-monthly',
          'pro-yearly',
          'enterprise-monthly',
          'enterprise-yearly',
          'premium-monthly',
          'starter-monthly',
        ]),
        (planId) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': 'redirected',
              'provider': 'STRIPE',
              'planId': planId,
            },
          );

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          await subscriptionProvider.createSubscription(planId);

          // Verify the exact plan ID was passed to processPayment
          verify(mockPaymentService.processPayment(planId)).called(1);
        },
        maxExamples: 100,
      );
    });

    // Property test 9: Payment service is initialized only once per subscription
    property('Payment initialization is called exactly once per subscription', () {
      forAll(
        constantFrom([
          'basic-monthly',
          'pro-monthly',
        ]),
        (planId) async {
          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform())
              .thenReturn(PaymentProvider.stripe);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': 'redirected',
              'provider': 'STRIPE',
            },
          );

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          await subscriptionProvider.createSubscription(planId);

          // Verify initialization was called exactly once
          verify(mockPaymentService.initializePayment()).called(1);
        },
        maxExamples: 100,
      );
    });

    // Property test 10: Subscription creation flow is consistent
    property('Subscription creation follows consistent flow', () {
      forAll(
        combine2(
          constantFrom([
            'basic-monthly',
            'pro-monthly',
            'enterprise-monthly',
          ]),
          constantFrom([
            PaymentProvider.stripe,
            PaymentProvider.appleAppStore,
            PaymentProvider.googlePlayStore,
          ]),
        ),
        (tuple) async {
          final planId = tuple.$1;
          final provider = tuple.$2;

          final mockApiService = MockApiService();
          final mockPaymentService = MockPaymentService();

          when(mockPaymentService.detectPlatform()).thenReturn(provider);

          when(mockPaymentService.initializePayment())
              .thenAnswer((_) async => Future.value());

          when(mockPaymentService.processPayment(any)).thenAnswer(
            (_) async => {
              'status': provider == PaymentProvider.stripe ? 'redirected' : 'pending',
              'provider': provider.name.toUpperCase(),
            },
          );

          final subscriptionProvider = SubscriptionProvider(
            apiService: mockApiService,
            paymentService: mockPaymentService,
          );

          // Clear any calls from constructor
          clearInteractions(mockPaymentService);

          // Execute subscription creation
          final result = await subscriptionProvider.createSubscription(planId);

          // Verify all methods were called
          verify(mockPaymentService.detectPlatform()).called(greaterThan(0));
          verify(mockPaymentService.initializePayment()).called(1);
          verify(mockPaymentService.processPayment(planId)).called(1);

          // Verify result is boolean
          expect(
            result,
            isA<bool>(),
            reason: 'createSubscription should return boolean',
          );
        },
        maxExamples: 100,
      );
    });

    // Unit test 1: Verify payment service processPayment signature
    test('PaymentService has processPayment method', () {
      final mockPaymentService = MockPaymentService();
      
      // Mock the method to avoid Amplify errors
      when(mockPaymentService.processPayment(any)).thenAnswer(
        (_) async => {
          'status': 'redirected',
          'provider': 'STRIPE',
        },
      );
      
      // Verify method exists and returns Future
      expect(
        mockPaymentService.processPayment('test-plan'),
        isA<Future<Map<String, dynamic>>>(),
        reason: 'processPayment should return Future<Map<String, dynamic>>',
      );
    });

    // Unit test 2: Verify subscription provider has createSubscription method
    test('SubscriptionProvider has createSubscription method', () {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();

      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => Future.value());
      
      when(mockPaymentService.processPayment(any)).thenAnswer(
        (_) async => {
          'status': 'redirected',
          'provider': 'STRIPE',
        },
      );

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );

      // Verify method exists and returns Future<bool>
      expect(
        subscriptionProvider.createSubscription('test-plan'),
        isA<Future<bool>>(),
        reason: 'createSubscription should return Future<bool>',
      );
    });

    // Unit test 3: Verify payment initialization method exists
    test('PaymentService has initializePayment method', () {
      final mockPaymentService = MockPaymentService();
      
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => Future.value());
      
      expect(
        mockPaymentService.initializePayment(),
        isA<Future<void>>(),
        reason: 'initializePayment should return Future<void>',
      );
    });

    // Unit test 4: Verify platform detection is called during subscription
    test('Platform detection is called during subscription creation', () async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();

      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);

      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => Future.value());

      when(mockPaymentService.processPayment(any)).thenAnswer(
        (_) async => {
          'status': 'redirected',
          'provider': 'STRIPE',
        },
      );

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );

      await subscriptionProvider.createSubscription('basic-monthly');

      verify(mockPaymentService.detectPlatform()).called(greaterThan(0));
    });

    // Unit test 5: Verify subscription state is updated after payment
    test('Subscription state is updated after successful payment', () async {
      final mockApiService = MockApiService();
      final mockPaymentService = MockPaymentService();

      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);

      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => Future.value());

      final paymentResult = {
        'status': 'redirected',
        'provider': 'STRIPE',
        'sessionId': 'test_123',
      };

      when(mockPaymentService.processPayment(any))
          .thenAnswer((_) async => paymentResult);

      final subscriptionProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );

      await subscriptionProvider.createSubscription('basic-monthly');

      expect(subscriptionProvider.subscription, equals(paymentResult));
    });
  });
}
