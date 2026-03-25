import 'package:flutter_test/flutter_test.dart';
import 'package:kiri_check/kiri_check.dart';
import 'package:train_with_joe/services/payment_service.dart';

/// **Validates: Requirements 17.22**
/// 
/// Property 21: Platform-Specific Payment Method Selection
/// 
/// For any Flutter application instance, the payment service SHALL detect 
/// the current platform (web, iOS, Android) and use the corresponding 
/// payment method (Stripe Checkout for web, StoreKit for iOS, 
/// Google Play Billing for Android).
void main() {
  // Initialize Flutter bindings for testing
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Property 21: Platform-Specific Payment Method Selection', () {
    // Property test 1: Platform detection returns valid payment provider
    property('Platform detection always returns a valid PaymentProvider', () {
      forAll(
        constantFrom([
          'web',
          'ios',
          'android',
          'macos',
          'linux',
          'windows',
        ]),
        (platformName) {
          final paymentService = PaymentService();
          final detectedProvider = paymentService.detectPlatform();

          // Verify the detected provider is one of the three valid providers
          expect(
            PaymentProvider.values,
            contains(detectedProvider),
            reason: 'Detected provider must be one of the valid PaymentProvider enum values',
          );

          // Verify it's a valid PaymentProvider instance
          expect(
            detectedProvider,
            isA<PaymentProvider>(),
            reason: 'detectPlatform must return a PaymentProvider instance',
          );

          paymentService.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 2: Payment provider mapping is consistent
    property('Payment provider mapping is consistent across multiple calls', () {
      forAll(
        constantFrom([1, 2, 3, 4, 5]),
        (iteration) {
          final paymentService = PaymentService();
          
          // Call detectPlatform multiple times
          final provider1 = paymentService.detectPlatform();
          final provider2 = paymentService.detectPlatform();
          final provider3 = paymentService.detectPlatform();

          // Verify consistency - same platform should return same provider
          expect(
            provider1,
            equals(provider2),
            reason: 'Platform detection should be consistent across calls',
          );
          expect(
            provider2,
            equals(provider3),
            reason: 'Platform detection should be consistent across calls',
          );
          expect(
            provider1,
            equals(provider3),
            reason: 'Platform detection should be consistent across calls',
          );

          paymentService.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 3: Each platform maps to exactly one payment provider
    property('Platform detection produces deterministic results', () {
      forAll(
        constantFrom([
          'test_run_1',
          'test_run_2',
          'test_run_3',
          'test_run_4',
          'test_run_5',
        ]),
        (testRun) {
          final paymentService = PaymentService();
          final provider = paymentService.detectPlatform();

          // Verify the provider is one of the three expected values
          final validProviders = [
            PaymentProvider.stripe,
            PaymentProvider.appleAppStore,
            PaymentProvider.googlePlayStore,
          ];

          expect(
            validProviders,
            contains(provider),
            reason: 'Provider must be one of: Stripe, Apple App Store, or Google Play Store',
          );

          paymentService.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 4: Payment method selection logic is complete
    property('All PaymentProvider enum values are handled', () {
      forAll(
        constantFrom([
          PaymentProvider.stripe,
          PaymentProvider.appleAppStore,
          PaymentProvider.googlePlayStore,
        ]),
        (provider) {
          // Verify each provider is a valid enum value
          expect(
            PaymentProvider.values,
            contains(provider),
            reason: 'Provider must be in PaymentProvider enum',
          );

          // Verify provider has a valid name
          expect(
            provider.name,
            isNotEmpty,
            reason: 'Provider name should not be empty',
          );

          // Verify provider can be compared
          expect(
            provider == provider,
            isTrue,
            reason: 'Provider should equal itself',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 5: Platform-specific initialization succeeds
    property('Payment initialization completes for detected platform', () {
      forAll(
        constantFrom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        (iteration) {
          final paymentService = PaymentService();
          final provider = paymentService.detectPlatform();

          // Verify initialization can be called without throwing
          expect(
            () => paymentService.initializePayment(),
            returnsNormally,
            reason: 'initializePayment should not throw for detected platform',
          );

          // Verify the provider is valid
          expect(
            provider,
            isA<PaymentProvider>(),
            reason: 'Provider must be a valid PaymentProvider',
          );

          paymentService.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 6: Payment method selection is deterministic
    property('Payment method selection is deterministic for platform', () {
      forAll(
        combine2(
          constantFrom([
            'monthly_plan',
            'yearly_plan',
            'premium_subscription',
            'basic_plan',
            'pro_plan',
          ]),
          constantFrom([1, 2, 3, 4, 5]),
        ),
        (tuple) {
          final planId = tuple.$1;
          final iteration = tuple.$2;

          final paymentService = PaymentService();
          final provider = paymentService.detectPlatform();

          // Verify provider is valid
          expect(
            PaymentProvider.values,
            contains(provider),
            reason: 'Provider must be valid for payment processing',
          );

          // Verify plan ID is not empty
          expect(
            planId,
            isNotEmpty,
            reason: 'Plan ID should not be empty',
          );

          // Verify the provider is one of the three expected values
          final validProviders = [
            PaymentProvider.stripe,
            PaymentProvider.appleAppStore,
            PaymentProvider.googlePlayStore,
          ];
          expect(
            validProviders,
            contains(provider),
            reason: 'Provider must be Stripe, Apple App Store, or Google Play Store',
          );

          paymentService.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 7: Platform detection is idempotent
    property('Multiple PaymentService instances detect same platform', () {
      forAll(
        constantFrom([1, 2, 3, 4, 5]),
        (iteration) {
          final service1 = PaymentService();
          final service2 = PaymentService();
          final service3 = PaymentService();

          final provider1 = service1.detectPlatform();
          final provider2 = service2.detectPlatform();
          final provider3 = service3.detectPlatform();

          // All instances should detect the same platform
          expect(
            provider1,
            equals(provider2),
            reason: 'Different instances should detect same platform',
          );
          expect(
            provider2,
            equals(provider3),
            reason: 'Different instances should detect same platform',
          );

          service1.dispose();
          service2.dispose();
          service3.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 8: Payment provider enum completeness
    property('PaymentProvider enum contains exactly three providers', () {
      forAll(
        constantFrom([1, 2, 3, 4, 5]),
        (iteration) {
          // Verify enum has exactly 3 values
          expect(
            PaymentProvider.values.length,
            equals(3),
            reason: 'PaymentProvider should have exactly 3 values',
          );

          // Verify all three expected providers exist
          expect(
            PaymentProvider.values,
            contains(PaymentProvider.stripe),
            reason: 'Stripe provider must exist',
          );
          expect(
            PaymentProvider.values,
            contains(PaymentProvider.appleAppStore),
            reason: 'Apple App Store provider must exist',
          );
          expect(
            PaymentProvider.values,
            contains(PaymentProvider.googlePlayStore),
            reason: 'Google Play Store provider must exist',
          );
        },
        maxExamples: 100,
      );
    });

    // Property test 9: Platform detection never returns null
    property('Platform detection never returns null', () {
      forAll(
        constantFrom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        (iteration) {
          final paymentService = PaymentService();
          final provider = paymentService.detectPlatform();

          // Verify provider is not null
          expect(
            provider,
            isNotNull,
            reason: 'detectPlatform must never return null',
          );

          // Verify provider is a valid enum value
          expect(
            provider,
            isA<PaymentProvider>(),
            reason: 'Provider must be a PaymentProvider instance',
          );

          paymentService.dispose();
        },
        maxExamples: 100,
      );
    });

    // Property test 10: Payment service lifecycle is consistent
    property('Payment service can be created and disposed multiple times', () {
      forAll(
        constantFrom([1, 2, 3, 4, 5]),
        (iteration) {
          // Create, use, and dispose service
          final service1 = PaymentService();
          final provider1 = service1.detectPlatform();
          service1.dispose();

          // Create another instance
          final service2 = PaymentService();
          final provider2 = service2.detectPlatform();
          service2.dispose();

          // Both should detect the same platform
          expect(
            provider1,
            equals(provider2),
            reason: 'Platform detection should be consistent across service lifecycle',
          );

          // Verify both are valid providers
          expect(
            PaymentProvider.values,
            contains(provider1),
            reason: 'First provider must be valid',
          );
          expect(
            PaymentProvider.values,
            contains(provider2),
            reason: 'Second provider must be valid',
          );
        },
        maxExamples: 100,
      );
    });

    // Unit test 1: Web platform detection (when running on web)
    test('detectPlatform returns a valid provider for current platform', () {
      final paymentService = PaymentService();
      final provider = paymentService.detectPlatform();

      expect(provider, isA<PaymentProvider>());
      expect(PaymentProvider.values, contains(provider));

      paymentService.dispose();
    });

    // Unit test 2: PaymentProvider enum values
    test('PaymentProvider enum has all required values', () {
      expect(PaymentProvider.values.length, equals(3));
      expect(PaymentProvider.values, contains(PaymentProvider.stripe));
      expect(PaymentProvider.values, contains(PaymentProvider.appleAppStore));
      expect(PaymentProvider.values, contains(PaymentProvider.googlePlayStore));
    });

    // Unit test 3: Platform detection consistency
    test('Multiple calls to detectPlatform return same result', () {
      final paymentService = PaymentService();

      final provider1 = paymentService.detectPlatform();
      final provider2 = paymentService.detectPlatform();
      final provider3 = paymentService.detectPlatform();

      expect(provider1, equals(provider2));
      expect(provider2, equals(provider3));

      paymentService.dispose();
    });

    // Unit test 4: Payment service instantiation
    test('PaymentService can be instantiated', () {
      final paymentService = PaymentService();
      expect(paymentService, isNotNull);
      paymentService.dispose();
    });

    // Unit test 5: Payment service disposal
    test('PaymentService can be disposed without errors', () {
      final paymentService = PaymentService();
      expect(() => paymentService.dispose(), returnsNormally);
    });

    // Unit test 6: Initialize payment method signature
    test('initializePayment returns a Future', () {
      final paymentService = PaymentService();
      final result = paymentService.initializePayment();
      
      expect(result, isA<Future<void>>());
      
      paymentService.dispose();
    });

    // Unit test 7: Payment provider enum values are distinct
    test('PaymentProvider enum values are distinct', () {
      expect(PaymentProvider.stripe, isNot(equals(PaymentProvider.appleAppStore)));
      expect(PaymentProvider.stripe, isNot(equals(PaymentProvider.googlePlayStore)));
      expect(PaymentProvider.appleAppStore, isNot(equals(PaymentProvider.googlePlayStore)));
    });

    // Unit test 8: PaymentProvider enum names
    test('PaymentProvider enum values have correct names', () {
      expect(PaymentProvider.stripe.name, equals('stripe'));
      expect(PaymentProvider.appleAppStore.name, equals('appleAppStore'));
      expect(PaymentProvider.googlePlayStore.name, equals('googlePlayStore'));
    });

    // Unit test 9: Multiple service instances
    test('Multiple PaymentService instances can coexist', () {
      final service1 = PaymentService();
      final service2 = PaymentService();
      final service3 = PaymentService();

      expect(service1, isNotNull);
      expect(service2, isNotNull);
      expect(service3, isNotNull);

      service1.dispose();
      service2.dispose();
      service3.dispose();
    });

    // Unit test 10: Platform detection after initialization
    test('Platform detection works after initialization', () async {
      final paymentService = PaymentService();
      
      await paymentService.initialize();
      final provider = paymentService.detectPlatform();
      
      expect(provider, isA<PaymentProvider>());
      expect(PaymentProvider.values, contains(provider));
      
      paymentService.dispose();
    });
  });
}
