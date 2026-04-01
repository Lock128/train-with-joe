import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/subscription_provider.dart';
import '../services/payment_service.dart';

/// Subscription management screen
class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final PaymentService _paymentService = PaymentService();
  PaymentProvider? _detectedPlatform;
  bool _handledCallback = false;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _detectedPlatform = _paymentService.detectPlatform();
    
    // Initialize payment service with callbacks
    _initializePaymentService();
    
    // Load subscription data when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handlePaymentCallback();
      context.read<SubscriptionProvider>().loadSubscription();
    });
  }

  @override
  void dispose() {
    _paymentService.dispose();
    super.dispose();
  }

  /// Initialize payment service with purchase callbacks
  Future<void> _initializePaymentService() async {
    if (_isInitialized) return;
    
    try {
      await _paymentService.initialize(
        onPurchaseUpdate: (result) {
          if (!mounted) return;
          
          // Update subscription provider with new subscription data
          context.read<SubscriptionProvider>().loadSubscription();
          
          // Show success message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                result['provider'] == 'APPLE_APP_STORE'
                    ? 'App Store purchase completed successfully!'
                    : 'Play Store purchase completed successfully!',
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 5),
            ),
          );
        },
        onPurchaseError: (error) {
          if (!mounted) return;
          
          // Show error message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Purchase failed: $error'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
            ),
          );
        },
      );
      
      _isInitialized = true;
      debugPrint('Payment service initialized successfully');
    } catch (e) {
      debugPrint('Error initializing payment service: $e');
    }
  }

  /// Handle payment callback from URL parameters
  Future<void> _handlePaymentCallback() async {
    if (_handledCallback) return;
    _handledCallback = true;

    // Check for success or canceled query parameters
    final uri = Uri.base;
    final success = uri.queryParameters['success'] == 'true';
    final canceled = uri.queryParameters['canceled'] == 'true';

    if (success || canceled) {
      // Handle the callback
      final result = await _paymentService.handleStripeCallback(
        success: success,
        sessionId: uri.queryParameters['session_id'],
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] as String),
            backgroundColor: result['success'] == true ? Colors.green : Colors.orange,
            duration: const Duration(seconds: 5),
          ),
        );

        // Clean up URL by removing query parameters
        if (kIsWeb) {
          context.go('/subscription');
        }
      }
    }
  }

  Future<void> _handleSubscribe(String planId) async {
    final subscriptionProvider = context.read<SubscriptionProvider>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    
    // Show loading dialog
    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final success = await subscriptionProvider.createSubscription(planId);
    
    // Close loading dialog
    if (mounted) {
      navigator.pop();

      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Subscription created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else if (subscriptionProvider.error != null) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(subscriptionProvider.error!),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleCancel() async {
    final subscriptionProvider = context.read<SubscriptionProvider>();
    final messenger = ScaffoldMessenger.of(context);

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Subscription'),
        content: const Text(
          'Are you sure you want to cancel your subscription? '
          'You will lose access to premium features.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep Subscription'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cancel Subscription'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final success = await subscriptionProvider.cancelSubscription();

    if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Subscription cancelled successfully'
                : subscriptionProvider.error ?? 'Failed to cancel subscription',
          ),
          backgroundColor: success ? Colors.orange : Colors.red,
        ),
      );
    }
  }

  /// Handle restore purchases (iOS only)
  Future<void> _handleRestorePurchases() async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final subscriptionProvider = context.read<SubscriptionProvider>();

    try {
      // Show loading dialog
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const AlertDialog(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Restoring purchases...'),
              ],
            ),
          ),
        );
      }

      await _paymentService.restorePurchases();
      
      // Close loading dialog
      if (mounted) {
        navigator.pop();
      }

      // Reload subscription data
      if (mounted) {
        await subscriptionProvider.loadSubscription();
        
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Purchases restored successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        navigator.pop();
        
        messenger.showSnackBar(
          SnackBar(
            content: Text('Failed to restore purchases: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getPlatformName() {
    switch (_detectedPlatform) {
      case PaymentProvider.stripe:
        return 'Web (Stripe)';
      case PaymentProvider.appleAppStore:
        return 'iOS (App Store)';
      case PaymentProvider.googlePlayStore:
        return 'Android (Play Store)';
      default:
        return 'Unknown';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<SubscriptionProvider>(
        builder: (context, subscriptionProvider, _) {
          if (subscriptionProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          final subscription = subscriptionProvider.subscription;
          final hasActiveSubscription = subscription != null &&
              subscription['status'] == 'ACTIVE';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Platform info
                    Card(
                      color: const Color(0xFFF0EDFF),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            Icon(
                              _detectedPlatform == PaymentProvider.stripe
                                  ? Icons.web
                                  : _detectedPlatform == PaymentProvider.appleAppStore
                                      ? Icons.apple
                                      : Icons.android,
                              color: const Color(0xFF6C5CE7),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Payment Platform',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    _getPlatformName(),
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Current subscription status
                    if (hasActiveSubscription) ...[
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(
                                    Icons.check_circle,
                                    color: Color(0xFF00B894),
                                    size: 32,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'Active Subscription',
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              _buildInfoRow('Status', subscription['status'] as String),
                              _buildInfoRow('Provider', subscription['provider'] as String),
                              if (subscription['planId'] != null)
                                _buildInfoRow('Plan', subscription['planId'] as String),
                              if (subscription['currentPeriodEnd'] != null)
                                _buildInfoRow(
                                  'Renews',
                                  _formatDate(subscription['currentPeriodEnd'] as String),
                                ),
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  onPressed: _handleCancel,
                                  icon: const Icon(Icons.cancel),
                                  label: const Text('Cancel Subscription'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red,
                                    padding: const EdgeInsets.all(16),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      // No active subscription - show plans
                      const Text(
                        'Choose a Plan',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Restore purchases button for iOS
                      if (_detectedPlatform == PaymentProvider.appleAppStore)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16.0),
                          child: OutlinedButton.icon(
                            onPressed: _handleRestorePurchases,
                            icon: const Icon(Icons.restore),
                            label: const Text('Restore Purchases'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.all(16),
                            ),
                          ),
                        ),
                      
                      // Basic plan
                      _buildPlanCard(
                        context,
                        title: 'Basic Plan',
                        price: '\$9.99/month',
                        features: const [
                          'Basic features',
                          'Email support',
                        ],
                        planId: 'basic-monthly',
                        isPopular: false,
                      ),
                      const SizedBox(height: 16),
                      
                      // Pro plan
                      _buildPlanCard(
                        context,
                        title: 'Pro Plan',
                        price: '\$19.99/month',
                        features: const [
                          'Access to all features',
                          'Priority support',
                          'Advanced analytics',
                        ],
                        planId: 'pro-monthly',
                        isPopular: true,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(
    BuildContext context, {
    required String title,
    required String price,
    required List<String> features,
    required String planId,
    required bool isPopular,
  }) {
    return Card(
      elevation: isPopular ? 4 : 1,
      child: Container(
        decoration: isPopular
            ? BoxDecoration(
                border: Border.all(color: const Color(0xFF6C5CE7), width: 2),
                borderRadius: BorderRadius.circular(12),
              )
            : null,
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isPopular)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6C5CE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'POPULAR',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              if (isPopular) const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                price,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: const Color(0xFF6C5CE7),
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              ...features.map(
                (feature) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    children: [
                      const Icon(Icons.check, color: Color(0xFF00B894), size: 20),
                      const SizedBox(width: 8),
                      Expanded(child: Text(feature)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _handleSubscribe(planId),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                    backgroundColor: isPopular ? const Color(0xFF6C5CE7) : null,
                  ),
                  child: const Text('Subscribe'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoDate;
    }
  }
}
