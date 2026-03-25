import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/payment_service.dart';
import '../providers/auth_provider.dart';

/// Provider for managing subscription state
class SubscriptionProvider extends ChangeNotifier {
  late final ApiService _apiService;
  late final PaymentService _paymentService;
  
  Map<String, dynamic>? _subscription;
  bool _isLoading = false;
  String? _error;
  AuthProvider? _authProvider;

  SubscriptionProvider({
    ApiService? apiService,
    PaymentService? paymentService,
  }) {
    _apiService = apiService ?? ApiService();
    _paymentService = paymentService ?? PaymentService();
  }

  Map<String, dynamic>? get subscription => _subscription;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Update auth provider reference
  void updateAuth(AuthProvider authProvider) {
    _authProvider = authProvider;
    if (authProvider.isAuthenticated && _subscription == null) {
      loadSubscription();
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
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
}
