import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/payment_service.dart';
import '../providers/auth_provider.dart';

/// Provider for managing subscription state
class SubscriptionProvider extends ChangeNotifier {
  late final ApiService _apiService;
  late final PaymentService _paymentService;
  
  Map<String, dynamic>? _subscription;
  Map<String, dynamic>? _usageLimits;
  bool _isLoading = false;
  String? _error;
  AuthProvider? _authProvider;

  // Plan ID state
  String? _basicPlanId;
  String? _proPlanId;
  bool _planIdsLoaded = false;
  String? _planIdsError;

  SubscriptionProvider({
    ApiService? apiService,
    PaymentService? paymentService,
  }) {
    _apiService = apiService ?? ApiService();
    _paymentService = paymentService ?? PaymentService();
  }

  Map<String, dynamic>? get subscription => _subscription;
  Map<String, dynamic>? get usageLimits => _usageLimits;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Plan ID getters
  String? get basicPlanId => _basicPlanId;
  String? get proPlanId => _proPlanId;
  bool get planIdsLoaded => _planIdsLoaded;
  String? get planIdsError => _planIdsError;

  /// Current tier from usage limits (defaults to FREE)
  String get currentTier => _usageLimits?['tier'] as String? ?? 'FREE';

  /// Current tier source
  String? get tierSource => _usageLimits?['tierSource'] as String?;

  /// Image scans used in current period
  int get imageScansUsed => _usageLimits?['imageScansUsed'] as int? ?? 0;

  /// Image scans limit (null means unlimited)
  int? get imageScansLimit => _usageLimits?['imageScansLimit'] as int?;

  /// Vocabulary lists used
  int get vocabularyListsUsed => _usageLimits?['vocabularyListsUsed'] as int? ?? 0;

  /// Vocabulary lists limit (null means unlimited)
  int? get vocabularyListsLimit => _usageLimits?['vocabularyListsLimit'] as int?;

  /// Whether AI training is enabled for the current tier
  bool get aiTrainingEnabled => _usageLimits?['aiTrainingEnabled'] as bool? ?? false;

  /// Update auth provider reference
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _subscription == null) {
      loadSubscription();
      loadUsageLimits();
    }
  }

  /// Load subscription status from API
  Future<void> loadSubscription() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) {
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

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
            createdAt
            updatedAt
          }
        }
      ''';

      final response = await _apiService.query(query);
      _subscription = response['getSubscriptionStatus'] as Map<String, dynamic>?;
      _error = null;
    } catch (e) {
      debugPrint('Error loading subscription: $e');
      _error = e.toString();
      _subscription = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load usage limits from API (tier, usage counts, limits)
  Future<void> loadUsageLimits() async {
    if (_authProvider == null || !_authProvider!.isAuthenticated) {
      return;
    }

    try {
      const query = '''
        query GetUsageLimits {
          getUsageLimits {
            success
            usageLimits {
              tier
              tierSource
              imageScansUsed
              imageScansLimit
              vocabularyListsUsed
              vocabularyListsLimit
              aiTrainingEnabled
            }
            error
          }
        }
      ''';

      final response = await _apiService.query(query);
      final result = response['getUsageLimits'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        _usageLimits = result['usageLimits'] as Map<String, dynamic>?;
      }
    } catch (e) {
      debugPrint('Error loading usage limits: $e');
    }
    notifyListeners();
  }

  /// Load plan IDs for the given platform from the backend
  Future<void> loadPlanIds(String platform) async {
    _planIdsLoaded = false;
    _planIdsError = null;
    notifyListeners();

    try {
      const query = '''
        query GetPlanIds(\$platform: PaymentProvider!) {
          getPlanIds(platform: \$platform) {
            success
            planIds {
              basicPlanId
              proPlanId
            }
            error
          }
        }
      ''';

      final response = await _apiService.query(query, variables: {'platform': platform});
      final result = response['getPlanIds'] as Map<String, dynamic>?;

      if (result != null && result['success'] == true) {
        final planIds = result['planIds'] as Map<String, dynamic>?;
        _basicPlanId = planIds?['basicPlanId'] as String?;
        _proPlanId = planIds?['proPlanId'] as String?;
        _planIdsError = null;
      } else {
        _planIdsError = result?['error'] as String? ?? 'Failed to load plan IDs';
        _basicPlanId = null;
        _proPlanId = null;
      }
    } catch (e) {
      debugPrint('Error loading plan IDs: $e');
      _planIdsError = e.toString();
      _basicPlanId = null;
      _proPlanId = null;
    } finally {
      _planIdsLoaded = true;
      notifyListeners();
    }
  }

  /// Create a new subscription
  Future<bool> createSubscription(String planId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Detect platform and use appropriate payment method
      final platform = _paymentService.detectPlatform();
      debugPrint('Creating subscription for platform: $platform');

      // Initialize payment
      await _paymentService.initializePayment();

      // Process payment
      final result = await _paymentService.processPayment(planId);
      
      // Update local subscription state
      _subscription = result;
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error creating subscription: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Cancel the current subscription
  Future<bool> cancelSubscription() async {
    if (_subscription == null) {
      _error = 'No active subscription to cancel';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const mutation = '''
        mutation CancelSubscription {
          cancelSubscription {
            id
            userId
            provider
            status
            planId
            currentPeriodEnd
          }
        }
      ''';

      final response = await _apiService.mutate(mutation);
      _subscription = response['cancelSubscription'] as Map<String, dynamic>?;
      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error canceling subscription: $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Clear subscription data (on sign out)
  void clear() {
    _subscription = null;
    _usageLimits = null;
    _error = null;
    _isLoading = false;
    _basicPlanId = null;
    _proPlanId = null;
    _planIdsLoaded = false;
    _planIdsError = null;
    notifyListeners();
  }
}
