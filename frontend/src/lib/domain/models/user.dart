/// Domain model representing a user in the system.
class User {
  final String id;
  final String? email;
  final String? name;
  final String? subscriptionStatus;
  final String? subscriptionProvider;
  final UserTier tier;
  final String? tierSource;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const User({
    required this.id,
    this.email,
    this.name,
    this.subscriptionStatus,
    this.subscriptionProvider,
    this.tier = UserTier.free,
    this.tierSource,
    this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String?,
      name: json['name'] as String?,
      subscriptionStatus: json['subscriptionStatus'] as String?,
      subscriptionProvider: json['subscriptionProvider'] as String?,
      tier: UserTier.fromString(json['tier'] as String?),
      tierSource: json['tierSource'] as String?,
      createdAt: _parseDateTime(json['createdAt']),
      updatedAt: _parseDateTime(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (email != null) 'email': email,
        if (name != null) 'name': name,
        if (subscriptionStatus != null) 'subscriptionStatus': subscriptionStatus,
        if (subscriptionProvider != null) 'subscriptionProvider': subscriptionProvider,
        'tier': tier.name.toUpperCase(),
        if (tierSource != null) 'tierSource': tierSource,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
        if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      };

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? subscriptionStatus,
    String? subscriptionProvider,
    UserTier? tier,
    String? tierSource,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      subscriptionProvider: subscriptionProvider ?? this.subscriptionProvider,
      tier: tier ?? this.tier,
      tierSource: tierSource ?? this.tierSource,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is User && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'User(id: $id, email: $email, name: $name, tier: $tier)';
}

/// User tier enum with parsing.
enum UserTier {
  free,
  basic,
  pro;

  static UserTier fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'BASIC':
        return UserTier.basic;
      case 'PRO':
        return UserTier.pro;
      case 'FREE':
      default:
        return UserTier.free;
    }
  }

  String get displayName {
    switch (this) {
      case UserTier.free:
        return 'Free';
      case UserTier.basic:
        return 'Basic';
      case UserTier.pro:
        return 'Pro';
    }
  }
}

DateTime? _parseDateTime(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  return null;
}

/// Alias for [User] to avoid conflicts with Amplify's AuthUser.
typedef AppUser = User;
