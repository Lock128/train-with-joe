import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:amplify_flutter/amplify_flutter.dart';

/// API service for making GraphQL requests using Amplify
class ApiService {
  /// Execute a GraphQL query
  Future<Map<String, dynamic>> query(String query, {Map<String, dynamic>? variables}) async {
    try {
      final request = GraphQLRequest<String>(
        document: query,
        variables: variables ?? {},
      );

      final response = await Amplify.API.query(request: request).response;

      if (response.hasErrors) {
        final errors = response.errors.map((e) => e.message).join(', ');
        throw Exception('GraphQL errors: $errors');
      }

      if (response.data == null) {
        throw Exception('No data returned from query');
      }

      // Parse the JSON response
      final Map<String, dynamic> data = _parseResponse(response.data!);
      return data;
    } on ApiException catch (e) {
      debugPrint('API query error: ${e.message}');
      throw Exception('API error: ${e.message}');
    } catch (e) {
      debugPrint('Query error: $e');
      rethrow;
    }
  }

  /// Execute a GraphQL mutation
  Future<Map<String, dynamic>> mutate(String mutation, {Map<String, dynamic>? variables}) async {
    try {
      final request = GraphQLRequest<String>(
        document: mutation,
        variables: variables ?? {},
      );

      final response = await Amplify.API.mutate(request: request).response;

      if (response.hasErrors) {
        final errors = response.errors.map((e) => e.message).join(', ');
        throw Exception('GraphQL errors: $errors');
      }

      if (response.data == null) {
        throw Exception('No data returned from mutation');
      }

      // Parse the JSON response
      final Map<String, dynamic> data = _parseResponse(response.data!);
      return data;
    } on ApiException catch (e) {
      debugPrint('API mutation error: ${e.message}');
      throw Exception('API error: ${e.message}');
    } catch (e) {
      debugPrint('Mutation error: $e');
      rethrow;
    }
  }

  /// Parse JSON response string to Map
  Map<String, dynamic> _parseResponse(String responseData) {
    try {
      return jsonDecode(responseData) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Error parsing response: $e');
      return {};
    }
  }
}
