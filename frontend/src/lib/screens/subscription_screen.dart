import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../l10n/generated/app_localizations.dart';
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

    // Load subscription and usage data when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handlePaymentCallback();
      final provider = context.read<SubscriptionProvider>();
      provider.loadSubscription();
      provider.loadUsageLimits();

      // Fetch platform-specific plan IDs
      final platformString = _platformToGraphQL(_detectedPlatform);
      if (platformString != null) {
        provider.loadPlanIds(platformString);
      }
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
          final provider = context.read<SubscriptionProvider>();
          provider.loadSubscription();
          provider.loadUsageLimits();

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
          final l10n = AppLocalizations.of(context)!;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(l10n.purchaseFailed(error)),
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
        final l10n = AppLocalizations.of(context)!;
        messenger.showSnackBar(
          SnackBar(
            content: Text(l10n.subscriptionCreated),
            backgroundColor: Colors.green,
          ),
        );
        // Reload usage limits after subscription change
        subscriptionProvider.loadUsageLimits();
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
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.cancelSubscription),
        content: Text(l10n.cancelSubscriptionConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.keepSubscription),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(l10n.cancelSubscription),
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
      // Reload usage limits after cancellation
      if (success) {
        subscriptionProvider.loadUsageLimits();
      }
    }
  }

  /// Handle restore purchases (iOS only)
  Future<void> _handleRestorePurchases() async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final l10n = AppLocalizations.of(context)!;
    final subscriptionProvider = context.read<SubscriptionProvider>();

    try {
      // Show loading dialog
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) {
            final l10n = AppLocalizations.of(context)!;
            return AlertDialog(
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(l10n.restoringPurchases),
                ],
              ),
            );
          },
        );
      }

      await _paymentService.restorePurchases();

      // Close loading dialog
      if (mounted) {
        navigator.pop();
      }

      // Reload subscription and usage data
      if (mounted) {
        await subscriptionProvider.loadSubscription();
        await subscriptionProvider.loadUsageLimits();

        messenger.showSnackBar(
          SnackBar(
            content: Text(l10n.purchasesRestored),
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
            content: Text(l10n.failedToRestorePurchases(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Map Flutter PaymentProvider to GraphQL PaymentProvider enum string
  String? _platformToGraphQL(PaymentProvider? platform) {
    switch (platform) {
      case PaymentProvider.stripe:
        return 'STRIPE';
      case PaymentProvider.appleAppStore:
        return 'APPLE_APP_STORE';
      case PaymentProvider.googlePlayStore:
        return 'GOOGLE_PLAY_STORE';
      default:
        return null;
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
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.subscription),
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
          final currentTier = subscriptionProvider.currentTier;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 800),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Platform info
                    Card(
                      color: const Color(0xFFE8F4FD),
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
                              color: const Color(0xFF2B6CB0),
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

                    // Usage indicators for active tier
                    if (subscriptionProvider.usageLimits != null)
                      _buildUsageSection(subscriptionProvider),

                    // Active subscription info
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
                                    color: Color(0xFFF0932B),
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
                                  label: Text(l10n.cancelSubscription),
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
                      const SizedBox(height: 24),
                    ],

                    // Plan IDs error banner
                    if (subscriptionProvider.planIdsError != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: Card(
                          color: const Color(0xFFFFF3CD),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              children: [
                                const Icon(Icons.warning_amber, color: Color(0xFF856404)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Unable to load plan information. Purchases are temporarily unavailable.',
                                    style: TextStyle(color: Colors.orange[900]),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                    // Tier cards heading
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
                          label: Text(l10n.restorePurchases),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.all(16),
                          ),
                        ),
                      ),

                    // Three tier cards
                    LayoutBuilder(
                      builder: (context, constraints) {
                        if (constraints.maxWidth >= 700) {
                          // Wide layout: side by side
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: _buildTierCard(
                                  context,
                                  tier: 'FREE',
                                  title: 'Free',
                                  price: '\$0',
                                  priceSubtitle: 'forever',
                                  features: const [
                                    '5 image scans',
                                    '5 vocabulary lists',
                                    'No AI training',
                                  ],
                                  planId: null,
                                  isCurrentTier: currentTier == 'FREE',
                                  isRecommended: false,
                                  hasActiveSubscription: hasActiveSubscription,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildTierCard(
                                  context,
                                  tier: 'BASIC',
                                  title: 'Basic',
                                  price: '\$2.99',
                                  priceSubtitle: '/month',
                                  features: const [
                                    '25 image scans per period',
                                    'Unlimited vocabulary lists',
                                    'No AI training',
                                  ],
                                  planId: subscriptionProvider.basicPlanId,
                                  isCurrentTier: currentTier == 'BASIC',
                                  isRecommended: false,
                                  hasActiveSubscription: hasActiveSubscription,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildTierCard(
                                  context,
                                  tier: 'PRO',
                                  title: 'Pro',
                                  price: '\$9.99',
                                  priceSubtitle: '/month',
                                  features: const [
                                    'Unlimited image scans',
                                    'Unlimited vocabulary lists',
                                    'AI training',
                                  ],
                                  planId: subscriptionProvider.proPlanId,
                                  isCurrentTier: currentTier == 'PRO',
                                  isRecommended: true,
                                  hasActiveSubscription: hasActiveSubscription,
                                ),
                              ),
                            ],
                          );
                        }
                        // Narrow layout: stacked
                        return Column(
                          children: [
                            _buildTierCard(
                              context,
                              tier: 'FREE',
                              title: 'Free',
                              price: '\$0',
                              priceSubtitle: 'forever',
                              features: const [
                                '5 image scans',
                                '5 vocabulary lists',
                                'No AI training',
                              ],
                              planId: null,
                              isCurrentTier: currentTier == 'FREE',
                              isRecommended: false,
                              hasActiveSubscription: hasActiveSubscription,
                            ),
                            const SizedBox(height: 16),
                            _buildTierCard(
                              context,
                              tier: 'BASIC',
                              title: 'Basic',
                              price: '\$2.99',
                              priceSubtitle: '/month',
                              features: const [
                                '25 image scans per period',
                                'Unlimited vocabulary lists',
                                'No AI training',
                              ],
                              planId: subscriptionProvider.basicPlanId,
                              isCurrentTier: currentTier == 'BASIC',
                              isRecommended: false,
                              hasActiveSubscription: hasActiveSubscription,
                            ),
                            const SizedBox(height: 16),
                            _buildTierCard(
                              context,
                              tier: 'PRO',
                              title: 'Pro',
                              price: '\$9.99',
                              priceSubtitle: '/month',
                              features: const [
                                'Unlimited image scans',
                                'Unlimited vocabulary lists',
                                'AI training',
                              ],
                              planId: subscriptionProvider.proPlanId,
                              isCurrentTier: currentTier == 'PRO',
                              isRecommended: true,
                              hasActiveSubscription: hasActiveSubscription,
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /// Build usage indicators section showing current usage vs limits
  Widget _buildUsageSection(SubscriptionProvider provider) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.bar_chart, color: Color(0xFF2B6CB0)),
                  const SizedBox(width: 8),
                  Text(
                    'Your Usage',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildUsageIndicator(
                label: 'Image Scans',
                icon: Icons.camera_alt,
                used: provider.imageScansUsed,
                limit: provider.imageScansLimit,
              ),
              const SizedBox(height: 12),
              _buildUsageIndicator(
                label: 'Vocabulary Lists',
                icon: Icons.list_alt,
                used: provider.vocabularyListsUsed,
                limit: provider.vocabularyListsLimit,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.smart_toy,
                    size: 20,
                    color: provider.aiTrainingEnabled
                        ? const Color(0xFF38A169)
                        : Colors.grey,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    provider.aiTrainingEnabled
                        ? 'AI Training: Enabled'
                        : 'AI Training: Not available',
                    style: TextStyle(
                      color: provider.aiTrainingEnabled
                          ? const Color(0xFF38A169)
                          : Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Build a single usage indicator bar
  Widget _buildUsageIndicator({
    required String label,
    required IconData icon,
    required int used,
    required int? limit,
  }) {
    final isUnlimited = limit == null;
    final progress = isUnlimited ? 0.0 : (limit > 0 ? (used / limit).clamp(0.0, 1.0) : 1.0);
    final isAtLimit = !isUnlimited && used >= limit;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: const Color(0xFF2B6CB0)),
                const SizedBox(width: 8),
                Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
              ],
            ),
            Text(
              isUnlimited ? '$used used (unlimited)' : '$used/$limit used',
              style: TextStyle(
                color: isAtLimit ? Colors.red : Colors.grey[600],
                fontWeight: isAtLimit ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
        if (!isUnlimited) ...[
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(
                isAtLimit ? Colors.red : const Color(0xFF2B6CB0),
              ),
              minHeight: 8,
            ),
          ),
        ],
      ],
    );
  }

  /// Build a tier card
  Widget _buildTierCard(
    BuildContext context, {
    required String tier,
    required String title,
    required String price,
    required String priceSubtitle,
    required List<String> features,
    required String? planId,
    required bool isCurrentTier,
    required bool isRecommended,
    required bool hasActiveSubscription,
  }) {
    final l10n = AppLocalizations.of(context)!;
    final isFree = planId == null;

    return Card(
      elevation: isRecommended ? 4 : 1,
      child: Container(
        decoration: isRecommended
            ? BoxDecoration(
                border: Border.all(color: const Color(0xFF2B6CB0), width: 2),
                borderRadius: BorderRadius.circular(12),
              )
            : isCurrentTier
                ? BoxDecoration(
                    border: Border.all(color: const Color(0xFFF0932B), width: 2),
                    borderRadius: BorderRadius.circular(12),
                  )
                : null,
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Badges row
              Row(
                children: [
                  if (isRecommended)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2B6CB0),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'RECOMMENDED',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  if (isCurrentTier) ...[
                    if (isRecommended) const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0932B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'CURRENT',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              if (isRecommended || isCurrentTier) const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Flexible(
                    child: Text(
                      price,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: const Color(0xFF2B6CB0),
                            fontWeight: FontWeight.bold,
                          ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    priceSubtitle,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ...features.map(
                (feature) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    children: [
                      Icon(
                        feature.startsWith('No ')
                            ? Icons.close
                            : Icons.check,
                        color: feature.startsWith('No ')
                            ? Colors.grey
                            : const Color(0xFFF0932B),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(feature)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (!isFree)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isCurrentTier ? null : () => _handleSubscribe(planId),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                      backgroundColor: isRecommended ? const Color(0xFF2B6CB0) : null,
                    ),
                    child: Text(
                      isCurrentTier ? 'Current Plan' : l10n.subscribe,
                    ),
                  ),
                ),
              if (isFree)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: null,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                    child: Text(
                      isCurrentTier ? 'Current Plan' : 'Free',
                    ),
                  ),
                ),
            ],
          ),
        ),
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

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoDate;
    }
  }
}
