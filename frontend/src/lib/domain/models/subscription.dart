/// Domain model representing a user's subscription.
class Subscription {
  final String id;
  final String userId;
  final String? provider;
  final SubscriptionStatus status;
  final String? planId;
  final DateTime? currentPeriodEnd;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Subscription({
    required this.id,
    required this.userId,
    this.provider,
    this.status = SubscriptionStatus.inactive,
    this.planId,
    this.currentPeriodEnd,
    this.createdAt,
    this.updatedAt,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'] as String,
      userId: json['userId'] as String? ?? '',
      provider: json['provider'] as String?,
      status: SubscriptionStatus.fromString(json['status'] as String?),
      planId: json['planId'] as String?,
      currentPeriodEnd: _parseDateTime(json['currentPeriodEnd']),
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
    );
  }

  bool get isActive => status == SubscriptionStatus.active;
}

/// Usage limits associated with the user's tier.
class UsageLimits {
  final String tier;
  final String? tierSource;
  final int imageScansUsed;
  final int? imageScansLimit;
  final int vocabularyListsUsed;
  final int? vocabularyListsLimit;
  final bool aiTrainingEnabled;

  const UsageLimits({
    this.tier = 'FREE',
    this.tierSource,
    this.imageScansUsed = 0,
    this.imageScansLimit,
    this.vocabularyListsUsed = 0,
    this.vocabularyListsLimit,
    this.aiTrainingEnabled = false,
  });

  factory UsageLimits.fromJson(Map<String, dynamic> json) {
    return UsageLimits(
      tier: json['tier'] as String? ?? 'FREE',
      tierSource: json['tierSource'] as String?,
      imageScansUsed: json['imageScansUsed'] as int? ?? 0,
      imageScansLimit: json['imageScansLimit'] as int?,
      vocabularyListsUsed: json['vocabularyListsUsed'] as int? ?? 0,
      vocabularyListsLimit: json['vocabularyListsLimit'] as int?,
      aiTrainingEnabled: json['aiTrainingEnabled'] as bool? ?? false,
    );
  }
}

enum SubscriptionStatus {
  active,
  inactive,
  canceled,
  expired;

  static SubscriptionStatus fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACTIVE':
        return SubscriptionStatus.active;
      case 'CANCELED':
        return SubscriptionStatus.canceled;
      case 'EXPIRED':
        return SubscriptionStatus.expired;
      case 'INACTIVE':
      default:
        return SubscriptionStatus.inactive;
    }
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  return null;
}
