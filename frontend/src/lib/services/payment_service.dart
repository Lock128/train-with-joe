import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:universal_io/io.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api_service.dart';

/// Payment provider enum matching backend
enum PaymentProvider {
  stripe,
  appleAppStore,
  googlePlayStore,
}

/// Payment service with platform-specific payment method selection
/// 
/// Supports three payment providers:
/// - Stripe (Web): Uses Stripe Checkout redirect flow
/// - Apple App Store (iOS): Uses StoreKit for in-app purchases
/// - Google Play Store (Android): Uses Google Play Billing for in-app purchases
/// 
/// Android Setup Requirements:
/// 1. Configure products in Google Play Console (Monetization > Products > Subscriptions)
/// 2. Product IDs must match those used in the app
/// 3. The app must be published to at least internal testing track
/// 4. Test with license testers configured in Google Play Console
/// 5. The in_app_purchase package handles all necessary Android permissions and dependencies
/// 
/// Usage:
/// ```dart
/// final paymentService = PaymentService();
/// await paymentService.initialize(
///   onPurchaseUpdate: (result) => print('Purchase: $result'),
///   onPurchaseError: (error) => print('Error: $error'),
/// );
/// 
/// // Process payment (automatically detects platform)
/// await paymentService.processPayment('monthly_subscription');
/// ```
class PaymentService {
  final ApiService _apiService = ApiService();
  InAppPurchase get _inAppPurchase => InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _purchaseSubscription;

  /// Callback for purchase updates
  Function(Map<String, dynamic>)? onPurchaseUpdate;

  /// Callback for purchase errors
  Function(String)? onPurchaseError;

  /// Initialize the payment service and set up purchase listeners
  Future<void> initialize({
    Function(Map<String, dynamic>)? onPurchaseUpdate,
    Function(String)? onPurchaseError,
  }) async {
    this.onPurchaseUpdate = onPurchaseUpdate;
    this.onPurchaseError = onPurchaseError;

    // Set up purchase stream listener for iOS and Android only
    if (!kIsWeb && (Platform.isIOS || Platform.isAndroid)) {
      _purchaseSubscription = _inAppPurchase.purchaseStream.listen(
        _handlePurchaseUpdates,
        onDone: () {
          debugPrint('Purchase stream closed');
        },
        onError: (error) {
          debugPrint('Purchase stream error: $error');
          onPurchaseError?.call('Purchase stream error: $error');
        },
      );
    }
  }

  /// Dispose of resources
  void dispose() {
    _purchaseSubscription?.cancel();
  }

  /// Handle purchase updates from the purchase stream
  Future<void> _handlePurchaseUpdates(List<PurchaseDetails> purchaseDetailsList) async {
    for (final purchaseDetails in purchaseDetailsList) {
      debugPrint('Purchase update: ${purchaseDetails.status}');
      
      if (purchaseDetails.status == PurchaseStatus.pending) {
        // Show pending UI
        debugPrint('Purchase pending: ${purchaseDetails.productID}');
      } else if (purchaseDetails.status == PurchaseStatus.error) {
        // Handle error
        final errorMessage = purchaseDetails.error?.message ?? 'Unknown error';
        debugPrint('Purchase error: $errorMessage');
        onPurchaseError?.call(errorMessage);
      } else if (purchaseDetails.status == PurchaseStatus.purchased ||
                 purchaseDetails.status == PurchaseStatus.restored) {
        // Verify and deliver purchase
        await _verifyAndDeliverPurchase(purchaseDetails);
      }

      // Mark purchase as complete
      if (purchaseDetails.pendingCompletePurchase) {
        await _inAppPurchase.completePurchase(purchaseDetails);
      }
    }
  }

  /// Verify purchase and deliver content
  Future<void> _verifyAndDeliverPurchase(PurchaseDetails purchaseDetails) async {
    try {
      final platform = detectPlatform();
      
      if (platform == PaymentProvider.appleAppStore) {
        // For iOS, validate the receipt with backend
        final receiptData = purchaseDetails.verificationData.serverVerificationData;
        final subscription = await validateAppStoreReceipt(receiptData);
        
        onPurchaseUpdate?.call({
          'status': 'completed',
          'subscription': subscription,
          'provider': 'APPLE_APP_STORE',
        });
      } else if (platform == PaymentProvider.googlePlayStore) {
        // For Android, validate with backend
        final purchaseToken = purchaseDetails.verificationData.serverVerificationData;
        final subscription = await validatePlayStoreReceipt(
          purchaseToken,
          purchaseDetails.productID,
        );
        
        onPurchaseUpdate?.call({
          'status': 'completed',
          'subscription': subscription,
          'provider': 'GOOGLE_PLAY_STORE',
        });
      }
    } catch (e) {
      debugPrint('Error verifying purchase: $e');
      onPurchaseError?.call('Failed to verify purchase: $e');
    }
  }

  /// Detect current platform and return appropriate payment provider
  PaymentProvider detectPlatform() {
    if (kIsWeb) {
      return PaymentProvider.stripe;
    } else if (Platform.isIOS) {
      return PaymentProvider.appleAppStore;
    } else if (Platform.isAndroid) {
      return PaymentProvider.googlePlayStore;
    } else {
      // Default to Stripe for other platforms
      return PaymentProvider.stripe;
    }
  }

  /// Initialize payment for the current platform
  Future<void> initializePayment() async {
    final platform = detectPlatform();
    
    switch (platform) {
      case PaymentProvider.stripe:
        debugPrint('Initializing Stripe payment (web)');
        break;
      case PaymentProvider.appleAppStore:
        debugPrint('Initializing App Store payment (iOS)');
        final available = await _inAppPurchase.isAvailable();
        if (!available) {
          throw Exception('In-app purchases not available');
        }
        break;
      case PaymentProvider.googlePlayStore:
        debugPrint('Initializing Play Store payment (Android)');
        final available = await _inAppPurchase.isAvailable();
        if (!available) {
          throw Exception('In-app purchases not available');
        }
        break;
    }
  }

  /// Process payment using platform-specific method
  Future<Map<String, dynamic>> processPayment(String planId) async {
    final platform = detectPlatform();
    
    switch (platform) {
      case PaymentProvider.stripe:
        return await _processStripePayment(planId);
      case PaymentProvider.appleAppStore:
        return await _processAppStorePayment(planId);
      case PaymentProvider.googlePlayStore:
        return await _processPlayStorePayment(planId);
    }
  }

  /// Process Stripe payment (web)
  Future<Map<String, dynamic>> _processStripePayment(String planId) async {
    try {
      // For web, we use Stripe Checkout redirect flow
      // The backend will create a checkout session and return the URL
      const mutation = '''
        mutation CreateStripeCheckout(\$planId: String!, \$successUrl: String!, \$cancelUrl: String!) {
          createStripeCheckout(input: {
            planId: \$planId,
            successUrl: \$successUrl,
            cancelUrl: \$cancelUrl
          }) {
            success
            checkoutUrl
            sessionId
            error
          }
        }
      ''';

      // Get current URL for success/cancel redirects
      final currentUrl = Uri.base.toString();
      final successUrl = '${currentUrl}subscription?success=true';
      final cancelUrl = '${currentUrl}subscription?canceled=true';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'planId': planId,
          'successUrl': successUrl,
          'cancelUrl': cancelUrl,
        },
      );

      final result = response['createStripeCheckout'] as Map<String, dynamic>;
      
      if (result['success'] == true && result['checkoutUrl'] != null) {
        // Redirect to Stripe Checkout
        await openStripeCheckout(result['checkoutUrl'] as String);
        
        return {
          'status': 'redirected',
          'sessionId': result['sessionId'],
          'provider': 'STRIPE',
        };
      } else {
        throw Exception(result['error'] ?? 'Failed to create checkout session');
      }
    } catch (e) {
      debugPrint('Stripe payment error: $e');
      rethrow;
    }
  }

  /// Process App Store payment (iOS)
  Future<Map<String, dynamic>> _processAppStorePayment(String productId) async {
    try {
      // Check if in-app purchases are available
      final available = await _inAppPurchase.isAvailable();
      if (!available) {
        throw Exception('In-app purchases are not available on this device');
      }

      // Query available products
      final ProductDetailsResponse response = await _inAppPurchase.queryProductDetails({productId});
      
      if (response.notFoundIDs.isNotEmpty) {
        throw Exception('Product not found: $productId. Please check the product ID in App Store Connect.');
      }

      if (response.productDetails.isEmpty) {
        throw Exception('No products available for purchase');
      }

      if (response.error != null) {
        throw Exception('Error querying products: ${response.error!.message}');
      }

      final product = response.productDetails.first;
      
      // Create purchase param for subscription
      final PurchaseParam purchaseParam = PurchaseParam(
        productDetails: product,
        applicationUserName: null, // Optional: can be used to link purchase to user
      );
      
      // Initiate purchase - this will trigger the purchase stream listener
      // For subscriptions, use buyNonConsumable (auto-renewable subscriptions are non-consumable)
      final bool purchaseInitiated = await _inAppPurchase.buyNonConsumable(
        purchaseParam: purchaseParam,
      );

      if (!purchaseInitiated) {
        throw Exception('Failed to initiate purchase');
      }

      // Note: Actual purchase completion is handled by purchase stream listener
      // The _handlePurchaseUpdates method will validate the receipt and update subscription
      return {
        'status': 'pending',
        'provider': 'APPLE_APP_STORE',
        'productId': productId,
        'message': 'Purchase initiated. Waiting for App Store confirmation...',
      };
    } catch (e) {
      debugPrint('App Store payment error: $e');
      rethrow;
    }
  }

  /// Process Play Store payment (Android)
  Future<Map<String, dynamic>> _processPlayStorePayment(String productId) async {
    try {
      // Check if in-app purchases are available
      final available = await _inAppPurchase.isAvailable();
      if (!available) {
        throw Exception('In-app purchases are not available on this device');
      }

      // Query available products
      final ProductDetailsResponse response = await _inAppPurchase.queryProductDetails({productId});
      
      if (response.notFoundIDs.isNotEmpty) {
        throw Exception('Product not found: $productId. Please check the product ID in Google Play Console.');
      }

      if (response.productDetails.isEmpty) {
        throw Exception('No products available for purchase');
      }

      if (response.error != null) {
        throw Exception('Error querying products: ${response.error!.message}');
      }

      final product = response.productDetails.first;
      
      // Create purchase param for subscription
      final PurchaseParam purchaseParam = PurchaseParam(
        productDetails: product,
        applicationUserName: null, // Optional: can be used to link purchase to user
      );
      
      // Initiate purchase - this will trigger the purchase stream listener
      // For subscriptions, use buyNonConsumable (subscriptions are non-consumable)
      final bool purchaseInitiated = await _inAppPurchase.buyNonConsumable(
        purchaseParam: purchaseParam,
      );

      if (!purchaseInitiated) {
        throw Exception('Failed to initiate purchase');
      }

      // Note: Actual purchase completion is handled by purchase stream listener
      // The _handlePurchaseUpdates method will validate the receipt and update subscription
      return {
        'status': 'pending',
        'provider': 'GOOGLE_PLAY_STORE',
        'productId': productId,
        'message': 'Purchase initiated. Waiting for Google Play confirmation...',
      };
    } catch (e) {
      debugPrint('Play Store payment error: $e');
      rethrow;
    }
  }

  /// Validate App Store receipt
  Future<Map<String, dynamic>> validateAppStoreReceipt(String receiptData) async {
    try {
      const mutation = '''
        mutation ValidateAppStoreReceipt(\$input: ValidateAppStoreReceiptInput!) {
          validateAppStoreReceipt(input: \$input) {
            success
            subscription {
              id
              userId
              provider
              status
              planId
              externalId
              currentPeriodEnd
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'receiptData': receiptData,
          }
        },
      );

      final result = response['validateAppStoreReceipt'] as Map<String, dynamic>;
      
      if (result['success'] == true && result['subscription'] != null) {
        return result['subscription'] as Map<String, dynamic>;
      } else {
        throw Exception(result['error'] ?? 'Failed to validate App Store receipt');
      }
    } catch (e) {
      debugPrint('App Store receipt validation error: $e');
      rethrow;
    }
  }

  /// Restore previous purchases (iOS and Android)
  /// This is required by Apple's guidelines for subscription apps
  /// Android also supports restoring purchases
  Future<void> restorePurchases() async {
    try {
      if (kIsWeb) {
        throw Exception('Restore purchases is not available on web');
      }

      debugPrint('Restoring purchases...');
      await _inAppPurchase.restorePurchases();
      
      // The restored purchases will be delivered through the purchase stream
      // and handled by _handlePurchaseUpdates
    } catch (e) {
      debugPrint('Error restoring purchases: $e');
      rethrow;
    }
  }

  /// Get pending purchases that need to be completed
  /// Useful for handling interrupted purchases
  Future<List<PurchaseDetails>> getPendingPurchases() async {
    try {
      if (kIsWeb) {
        return [];
      }

      // For iOS, we can check for pending transactions
      // For Android, pending purchases are handled automatically by the purchase stream
      debugPrint('Checking for pending purchases...');
      
      // The purchase stream will automatically deliver any pending purchases
      // when the app starts and the listener is set up
      return [];
    } catch (e) {
      debugPrint('Error getting pending purchases: $e');
      return [];
    }
  }

  /// Validate Play Store receipt
  Future<Map<String, dynamic>> validatePlayStoreReceipt(String purchaseToken, String productId) async {
    try {
      const mutation = '''
        mutation ValidatePlayStoreReceipt(\$input: ValidatePlayStoreReceiptInput!) {
          validatePlayStoreReceipt(input: \$input) {
            success
            subscription {
              id
              userId
              provider
              status
              planId
              externalId
              currentPeriodEnd
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'purchaseToken': purchaseToken,
            'productId': productId,
          }
        },
      );

      final result = response['validatePlayStoreReceipt'] as Map<String, dynamic>;
      
      if (result['success'] == true && result['subscription'] != null) {
        return result['subscription'] as Map<String, dynamic>;
      } else {
        throw Exception(result['error'] ?? 'Failed to validate Play Store receipt');
      }
    } catch (e) {
      debugPrint('Play Store receipt validation error: $e');
      rethrow;
    }
  }

  /// Open Stripe Checkout (web only)
  Future<void> openStripeCheckout(String checkoutUrl) async {
    if (!kIsWeb) {
      throw Exception('Stripe Checkout is only available on web');
    }

    final uri = Uri.parse(checkoutUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      throw Exception('Could not launch Stripe Checkout');
    }
  }

  /// Handle payment callback from Stripe Checkout
  /// Call this when user returns from Stripe Checkout
  Future<Map<String, dynamic>> handleStripeCallback({
    required bool success,
    String? sessionId,
  }) async {
    if (success) {
      // Payment succeeded - fetch updated subscription status
      try {
        const query = '''
          query GetSubscriptionStatus {
            getSubscriptionStatus {
              id
              userId
              provider
              status
              planId
              currentPeriodEnd
            }
          }
        ''';

        final response = await _apiService.query(query);
        final subscription = response['getSubscriptionStatus'];

        return {
          'success': true,
          'subscription': subscription,
          'message': 'Payment successful! Your subscription is now active.',
        };
      } catch (e) {
        debugPrint('Error fetching subscription after payment: $e');
        return {
          'success': true,
          'message': 'Payment successful! Please refresh to see your subscription.',
        };
      }
    } else {
      // Payment was canceled
      return {
        'success': false,
        'message': 'Payment was canceled. You can try again when ready.',
      };
    }
  }
}
