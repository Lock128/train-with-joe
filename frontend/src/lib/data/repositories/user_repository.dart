import 'package:flutter/foundation.dart';
import '../../domain/models/user.dart';
import '../../domain/result.dart';
import '../../services/api_service.dart';

/// Repository for user data operations.
/// Encapsulates all GraphQL queries/mutations related to user management.
class UserRepository {
  final ApiService _apiService;

  UserRepository({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  /// Fetch the current user by ID.
  Future<Result<AppUser>> getUser(String userId) async {
    try {
      const query = '''
        query GetUser(\$id: ID!) {
          getUser(id: \$id) {
            id
            email
            name
            subscriptionStatus
            subscriptionProvider
            tier
            tierSource
            createdAt
            updatedAt
          }
        }
      ''';

      final response = await _apiService.query(
        query,
        variables: {'id': userId},
      );

      final userData = response['getUser'] as Map<String, dynamic>?;
      if (userData == null) {
        return const Result.failure('User not found');
      }

      return Result.success(AppUser.fromJson(userData));
    } catch (e) {
      debugPrint('Error loading user: $e');
      return Result.failure(e.toString());
    }
  }

  /// Update user data (name and/or email).
  Future<Result<AppUser>> updateUser(
    String userId, {
    String? name,
    String? email,
  }) async {
    try {
      const mutation = '''
        mutation UpdateUser(\$input: UpdateUserInput!) {
          updateUser(input: \$input) {
            success
            user {
              id
              email
              name
              subscriptionStatus
              subscriptionProvider
              tier
              tierSource
              createdAt
              updatedAt
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'id': userId,
            if (name != null) 'name': name,
            if (email != null) 'email': email,
          },
        },
      );

      final result = response['updateUser'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final userData = result['user'] as Map<String, dynamic>?;
        if (userData != null) {
          return Result.success(AppUser.fromJson(userData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to update user',
      );
    } catch (e) {
      debugPrint('Error updating user: $e');
      return Result.failure(e.toString());
    }
  }

  /// Fetch all users (admin only).
  Future<Result<List<AppUser>>> getUsers() async {
    try {
      const query = '''
        query GetUsers {
          getUsers {
            id
            email
            name
            tier
            tierSource
            subscriptionProvider
            createdAt
          }
        }
      ''';
      final response = await _apiService.query(query);
      final list = response['getUsers'] as List<dynamic>?;
      if (list == null) return const Result.success([]);
      final users = list
          .map((item) => AppUser.fromJson(item as Map<String, dynamic>))
          .toList();
      return Result.success(users);
    } catch (e) {
      debugPrint('Error fetching users: $e');
      return Result.failure(e.toString());
    }
  }

  /// Admin set user tier.
  Future<Result<AppUser>> adminSetUserTier(
    String userId,
    String tier,
  ) async {
    try {
      const mutation = '''
        mutation AdminSetUserTier(\$input: AdminSetUserTierInput!) {
          adminSetUserTier(input: \$input) {
            success
            user {
              id
              email
              name
              tier
              tierSource
              subscriptionProvider
              createdAt
              updatedAt
            }
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {'userId': userId, 'tier': tier},
        },
      );

      final result = response['adminSetUserTier'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final userData = result['user'] as Map<String, dynamic>?;
        if (userData != null) {
          return Result.success(AppUser.fromJson(userData));
        }
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to set user tier',
      );
    } catch (e) {
      debugPrint('Error setting user tier: $e');
      return Result.failure(e.toString());
    }
  }

  /// Fetch tier statistics (admin only).
  Future<Result<List<Map<String, dynamic>>>> getTierStatistics() async {
    try {
      const query = '''
        query GetTierStatistics {
          getTierStatistics {
            success
            statistics {
              tier
              subscriptionCount
              manualCount
              totalCount
            }
            error
          }
        }
      ''';
      final response = await _apiService.query(query);
      final result = response['getTierStatistics'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        final list = result['statistics'] as List<dynamic>?;
        if (list == null) return const Result.success([]);
        return Result.success(list.cast<Map<String, dynamic>>());
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to get tier statistics',
      );
    } catch (e) {
      debugPrint('Error fetching tier statistics: $e');
      return Result.failure(e.toString());
    }
  }

  /// Migrate user data from one user to another (admin only).
  Future<Result<Map<String, dynamic>>> migrateUserData(
    String sourceUserId,
    String targetUserId,
  ) async {
    try {
      const mutation = '''
        mutation MigrateUserData(\$input: MigrateUserDataInput!) {
          migrateUserData(input: \$input) {
            success
            migratedVocabularyLists
            migratedTrainings
            migratedExecutions
            error
          }
        }
      ''';

      final response = await _apiService.mutate(
        mutation,
        variables: {
          'input': {
            'sourceUserId': sourceUserId,
            'targetUserId': targetUserId,
          },
        },
      );

      final result = response['migrateUserData'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        return Result.success(result);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to migrate user data',
      );
    } catch (e) {
      debugPrint('Error migrating user data: $e');
      return Result.failure(e.toString());
    }
  }

  /// Sync Cognito users missing from DynamoDB (admin only).
  Future<Result<int>> syncMissingUsers() async {
    try {
      const mutation = '''
        mutation SyncMissingUsers {
          syncMissingUsers {
            success
            createdCount
            error
          }
        }
      ''';

      final response = await _apiService.mutate(mutation);
      final result = response['syncMissingUsers'] as Map<String, dynamic>?;
      if (result != null && result['success'] == true) {
        return Result.success(result['createdCount'] as int? ?? 0);
      }
      return Result.failure(
        result?['error'] as String? ?? 'Failed to sync missing users',
      );
    } catch (e) {
      debugPrint('Error syncing missing users: $e');
      return Result.failure(e.toString());
    }
  }
}
