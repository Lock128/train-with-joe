import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:train_with_joe/providers/subscription_provider.dart';
import 'package:train_with_joe/providers/auth_provider.dart';
import 'package:train_with_joe/services/api_service.dart';
import 'package:train_with_joe/services/payment_service.dart';

import 'subscription_provider_test.mocks.dart';

@GenerateMocks([ApiService, PaymentService, AuthProvider])
void main() {
  // Initialize Flutter binding for tests
  TestWidgetsFlutterBinding.ensureInitialized();
  
  late SubscriptionProvider subscriptionProvider;
  late MockApiService mockApiService;
  late MockPaymentService mockPaymentService;
  late MockAuthProvider mockAuthProvider;

  setUp(() {
    mockApiService = MockApiService();
    mockPaymentService = MockPaymentService();
    mockAuthProvider = MockAuthProvider();
    
    // Create provider without dependencies for basic tests
    // Note: These tests only test the public interface without mocked dependencies
    subscriptionProvider = SubscriptionProvider(
      apiService: mockApiService,
      paymentService: mockPaymentService,
    );
  });

  group('SubscriptionProvider Widget Tests - Requirements 11.6, 11.7', () {
    test('initial state should have no subscription and not loading', () {
      expect(subscriptionProvider.subscription, null);
      expect(subscriptionProvider.isLoading, false);
      expect(subscriptionProvider.error, null);
    });

    test('clear should reset all state', () {
      // Act
      subscriptionProvider.clear();

      // Assert
      expect(subscriptionProvider.subscription, null);
      expect(subscriptionProvider.error, null);
      expect(subscriptionProvider.isLoading, false);
    });

    test('state changes should notify listeners', () {
      // Arrange
      int notificationCount = 0;
      subscriptionProvider.addListener(() {
        notificationCount++;
      });

      // Act
      subscriptionProvider.clear();

      // Assert - should notify once
      expect(notificationCount, 1);
    });
  });

  group('SubscriptionProvider with Mocked Dependencies', () {
    late SubscriptionProvider testableProvider;

    setUp(() {
      mockApiService = MockApiService();
      mockPaymentService = MockPaymentService();
      mockAuthProvider = MockAuthProvider();
      
      testableProvider = SubscriptionProvider(
        apiService: mockApiService,
        paymentService: mockPaymentService,
      );
    });

    test('loadSubscription should fetch subscription from API', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      
      final mockSubscription = {
        'id': 'sub-123',
        'userId': 'user-456',
        'provider': 'STRIPE',
        'status': 'ACTIVE',
        'planId': 'monthly',
        'currentPeriodEnd': '2024-12-31T23:59:59Z',
        'createdAt': '2024-01-01T00:00:00Z',
        'updatedAt': '2024-01-01T00:00:00Z',
      };

      when(mockApiService.query(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'getSubscriptionStatus': mockSubscription,
      });

      // Set auth provider first (this will trigger one load)
      testableProvider.updateAuth(mockAuthProvider);
      await Future.delayed(Duration(milliseconds: 50));
      
      // Reset the mock call count
      clearInteractions(mockApiService);

      // Act - explicitly call loadSubscription
      await testableProvider.loadSubscription();

      // Assert
      expect(testableProvider.subscription, mockSubscription);
      expect(testableProvider.error, null);
      expect(testableProvider.isLoading, false);
      verify(mockApiService.query(any, variables: anyNamed('variables'))).called(1);
    });

    test('loadSubscription should handle API errors', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      testableProvider.updateAuth(mockAuthProvider);
      
      // Clear any initial calls from updateAuth
      await Future.delayed(Duration(milliseconds: 50));
      clearInteractions(mockApiService);
      
      when(mockApiService.query(any, variables: anyNamed('variables')))
          .thenThrow(Exception('Network error'));

      // Act
      await testableProvider.loadSubscription();

      // Assert
      expect(testableProvider.subscription, null);
      expect(testableProvider.error, contains('Network error'));
      expect(testableProvider.isLoading, false);
    });

    test('loadSubscription should set loading state during operation', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      testableProvider.updateAuth(mockAuthProvider);
      
      // Wait for initial load from updateAuth
      await Future.delayed(Duration(milliseconds: 50));
      clearInteractions(mockApiService);
      
      when(mockApiService.query(any, variables: anyNamed('variables'))).thenAnswer((_) async {
        await Future.delayed(Duration(milliseconds: 100));
        return {
          'getSubscriptionStatus': {
            'id': 'sub-123',
            'status': 'ACTIVE',
          },
        };
      });

      // Act
      final loadFuture = testableProvider.loadSubscription();
      
      // Assert - check loading state during operation
      await Future.delayed(Duration(milliseconds: 10));
      expect(testableProvider.isLoading, true);
      
      await loadFuture;
      expect(testableProvider.isLoading, false);
    });

    test('loadSubscription should not execute if not authenticated', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(false);
      testableProvider.updateAuth(mockAuthProvider);

      // Act
      await testableProvider.loadSubscription();

      // Assert
      verifyNever(mockApiService.query(any, variables: anyNamed('variables')));
      expect(testableProvider.subscription, null);
    });

    test('createSubscription should process payment and update state', () async {
      // Arrange
      final mockSubscription = {
        'id': 'sub-789',
        'userId': 'user-456',
        'provider': 'STRIPE',
        'status': 'ACTIVE',
        'planId': 'monthly',
      };

      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => {});
      when(mockPaymentService.processPayment(any))
          .thenAnswer((_) async => mockSubscription);

      // Act
      final result = await testableProvider.createSubscription('monthly');

      // Assert
      expect(result, true);
      expect(testableProvider.subscription, mockSubscription);
      expect(testableProvider.error, null);
      expect(testableProvider.isLoading, false);
      verify(mockPaymentService.detectPlatform()).called(1);
      verify(mockPaymentService.initializePayment()).called(1);
      verify(mockPaymentService.processPayment('monthly')).called(1);
    });

    test('createSubscription should handle payment errors', () async {
      // Arrange
      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => {});
      when(mockPaymentService.processPayment(any))
          .thenThrow(Exception('Payment failed'));

      // Act
      final result = await testableProvider.createSubscription('monthly');

      // Assert
      expect(result, false);
      expect(testableProvider.subscription, null);
      expect(testableProvider.error, contains('Payment failed'));
      expect(testableProvider.isLoading, false);
    });

    test('createSubscription should set loading state during operation', () async {
      // Arrange
      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async {
        await Future.delayed(Duration(milliseconds: 100));
      });
      when(mockPaymentService.processPayment(any))
          .thenAnswer((_) async {
        await Future.delayed(Duration(milliseconds: 100));
        return {'id': 'sub-123', 'status': 'ACTIVE'};
      });

      // Act
      final createFuture = testableProvider.createSubscription('monthly');
      
      // Assert - check loading state during operation
      await Future.delayed(Duration(milliseconds: 10));
      expect(testableProvider.isLoading, true);
      
      await createFuture;
      expect(testableProvider.isLoading, false);
    });

    test('cancelSubscription should cancel active subscription', () async {
      // Arrange - first create a subscription to have something to cancel
      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => {});
      when(mockPaymentService.processPayment(any))
          .thenAnswer((_) async => {
        'id': 'sub-123',
        'status': 'ACTIVE',
      });
      await testableProvider.createSubscription('monthly');

      final canceledSubscription = {
        'id': 'sub-123',
        'userId': 'user-456',
        'provider': 'STRIPE',
        'status': 'CANCELLED',
        'planId': 'monthly',
        'currentPeriodEnd': '2024-12-31T23:59:59Z',
      };

      when(mockApiService.mutate(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'cancelSubscription': canceledSubscription,
      });

      // Act
      final result = await testableProvider.cancelSubscription();

      // Assert
      expect(result, true);
      expect(testableProvider.subscription, canceledSubscription);
      expect(testableProvider.subscription!['status'], 'CANCELLED');
      expect(testableProvider.error, null);
      expect(testableProvider.isLoading, false);
      verify(mockApiService.mutate(any, variables: anyNamed('variables'))).called(1);
    });

    test('cancelSubscription should fail if no active subscription', () async {
      // Arrange - no subscription set
      expect(testableProvider.subscription, null);

      // Act
      final result = await testableProvider.cancelSubscription();

      // Assert
      expect(result, false);
      expect(testableProvider.error, 'No active subscription to cancel');
      verifyNever(mockApiService.mutate(any, variables: anyNamed('variables')));
    });

    test('cancelSubscription should handle API errors', () async {
      // Arrange - first create a subscription
      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => {});
      when(mockPaymentService.processPayment(any))
          .thenAnswer((_) async => {
        'id': 'sub-123',
        'status': 'ACTIVE',
      });
      await testableProvider.createSubscription('monthly');

      when(mockApiService.mutate(any, variables: anyNamed('variables')))
          .thenThrow(Exception('API error'));

      // Act
      final result = await testableProvider.cancelSubscription();

      // Assert
      expect(result, false);
      expect(testableProvider.error, contains('API error'));
      expect(testableProvider.isLoading, false);
    });

    test('cancelSubscription should set loading state during operation', () async {
      // Arrange - first create a subscription
      when(mockPaymentService.detectPlatform())
          .thenReturn(PaymentProvider.stripe);
      when(mockPaymentService.initializePayment())
          .thenAnswer((_) async => {});
      when(mockPaymentService.processPayment(any))
          .thenAnswer((_) async => {
        'id': 'sub-123',
        'status': 'ACTIVE',
      });
      await testableProvider.createSubscription('monthly');

      when(mockApiService.mutate(any, variables: anyNamed('variables'))).thenAnswer((_) async {
        await Future.delayed(Duration(milliseconds: 100));
        return {
          'cancelSubscription': {
            'id': 'sub-123',
            'status': 'CANCELLED',
          },
        };
      });

      // Act
      final cancelFuture = testableProvider.cancelSubscription();
      
      // Assert - check loading state during operation
      await Future.delayed(Duration(milliseconds: 10));
      expect(testableProvider.isLoading, true);
      
      await cancelFuture;
      expect(testableProvider.isLoading, false);
    });

    test('updateAuth should load subscription if authenticated', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      when(mockApiService.query(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'getSubscriptionStatus': {
          'id': 'sub-123',
          'status': 'ACTIVE',
        },
      });

      // Act
      testableProvider.updateAuth(mockAuthProvider);
      await Future.delayed(Duration(milliseconds: 50)); // Wait for async load

      // Assert - updateAuth triggers both loadSubscription and loadUsageLimits
      verify(mockApiService.query(any, variables: anyNamed('variables'))).called(2);
    });

    test('updateAuth should not load subscription if not authenticated', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(false);

      // Act
      testableProvider.updateAuth(mockAuthProvider);
      await Future.delayed(Duration(milliseconds: 50));

      // Assert
      verifyNever(mockApiService.query(any, variables: anyNamed('variables')));
    });

    test('multiple operations should update state correctly', () async {
      // Arrange
      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      testableProvider.updateAuth(mockAuthProvider);

      // First load subscription
      when(mockApiService.query(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'getSubscriptionStatus': {
          'id': 'sub-123',
          'status': 'ACTIVE',
        },
      });
      await testableProvider.loadSubscription();
      expect(testableProvider.subscription!['status'], 'ACTIVE');

      // Then cancel subscription
      when(mockApiService.mutate(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'cancelSubscription': {
          'id': 'sub-123',
          'status': 'CANCELLED',
        },
      });
      await testableProvider.cancelSubscription();
      expect(testableProvider.subscription!['status'], 'CANCELLED');

      // Finally clear
      testableProvider.clear();
      expect(testableProvider.subscription, null);
    });

    test('error state should be cleared on successful operation', () async {
      // Arrange - create error state
      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      testableProvider.updateAuth(mockAuthProvider);
      when(mockApiService.query(any, variables: anyNamed('variables')))
          .thenThrow(Exception('First error'));
      await testableProvider.loadSubscription();
      expect(testableProvider.error, isNotNull);

      // Act - successful operation
      when(mockApiService.query(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'getSubscriptionStatus': {
          'id': 'sub-123',
          'status': 'ACTIVE',
        },
      });
      await testableProvider.loadSubscription();

      // Assert
      expect(testableProvider.error, null);
      expect(testableProvider.subscription, isNotNull);
    });

    test('state changes should notify listeners for all operations', () async {
      // Arrange
      int notificationCount = 0;
      testableProvider.addListener(() {
        notificationCount++;
      });

      when(mockAuthProvider.isAuthenticated).thenReturn(true);
      when(mockApiService.query(any, variables: anyNamed('variables'))).thenAnswer((_) async => {
        'getSubscriptionStatus': {'id': 'sub-123'},
      });

      // Act
      testableProvider.updateAuth(mockAuthProvider);
      await testableProvider.loadSubscription();

      // Assert - should notify multiple times (loading start, completion, etc.)
      expect(notificationCount, greaterThanOrEqualTo(2));
    });
  });
}
