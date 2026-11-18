import 'dart:async';

import 'package:amplify_flutter/amplify_flutter.dart'
    show
        AWSBaseHttpRequest,
        AWSBaseHttpResponse,
        AWSHttpMethod,
        AWSCustomHttpClient,
        AWSHttpClient,
        AWSHttpOperation,
        BadCertificateCallback,
        SupportedProtocols;
import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:amplify_api/amplify_api.dart' show APIPluginOptions;
import 'package:flutter/foundation.dart';

/// API plugin options that send all Amplify API requests through
/// [Dash0AmplifyHttpClient]. Used by `main.dart`.
APIPluginOptions dash0AmplifyApiOptions() =>
    APIPluginOptions(baseHttpClient: Dash0AmplifyHttpClient());

/// Starts a Dash0 client span, see [Dash0.startHttpRequest].
typedef Dash0HttpSpanStarter =
    Dash0HttpSpan? Function(String method, String url);

/// HTTP client for the Amplify API plugin (GraphQL/AppSync and REST) that
/// creates a Dash0 client span for every request.
///
/// Amplify sends requests through [AWSHttpClient], which the `dart:io`
/// overrides and `Dash0.httpClient` of the Dash0 SDK never see. Without this
/// wrapper no backend request spans exist. Pass an instance as
/// `APIPluginOptions.baseHttpClient`.
///
/// Spans are created without trace propagation headers unless the SDK
/// propagators match the URL (`propagateTraceHeaders` is off on web because
/// of CORS). The client behaves like a plain passthrough while the SDK is not
/// initialized or disabled, and telemetry errors never reach the caller.
class Dash0AmplifyHttpClient extends AWSCustomHttpClient {
  Dash0AmplifyHttpClient({AWSHttpClient? inner, Dash0HttpSpanStarter? starter})
    : _inner = inner ?? AWSHttpClient(),
      _starter = starter ?? Dash0.startHttpRequest;

  final AWSHttpClient _inner;
  final Dash0HttpSpanStarter _starter;

  @override
  BadCertificateCallback get onBadCertificate => _inner.onBadCertificate;

  @override
  set onBadCertificate(BadCertificateCallback value) {
    _inner.onBadCertificate = value;
  }

  @override
  SupportedProtocols get supportedProtocols => _inner.supportedProtocols;

  @override
  set supportedProtocols(SupportedProtocols value) {
    _inner.supportedProtocols = value;
  }

  @override
  AWSHttpOperation send(
    AWSBaseHttpRequest request, {
    FutureOr<void> Function()? onCancel,
  }) {
    final span = _startSpan(request);
    final operationInspection = _inspectRequest(request, span);
    final AWSHttpOperation operation;
    try {
      operation = _inner.send(request, onCancel: onCancel);
    } catch (e, st) {
      span?.finish(error: e, stackTrace: st);
      rethrow;
    }
    if (span == null) return operation;
    try {
      // Observes the outcome without changing what the caller receives.
      operation.operation.then<void>(
        (response) async {
          span.setResponse(
            response.statusCode,
            contentLength: int.tryParse(
              response.headers['content-length'] ?? '',
            ),
          );
          // Split synchronously, before anyone reads the body.
          final errorInspection = _inspectResponse(response);
          try {
            span.setGraphQLOperation(await operationInspection);
            span.setGraphQLErrors(await errorInspection);
          } catch (_) {
            // Telemetry must never affect the request.
          }
          span.finish();
        },
        onError: (Object e, StackTrace st) =>
            span.finish(error: e, stackTrace: st),
        onCancel: () => span.finish(error: 'Request cancelled'),
      );
    } catch (e, st) {
      span.finish(error: e, stackTrace: st);
    }
    return operation;
  }

  /// Reads the GraphQL operation from a copy of the request body. The copy
  /// is made before the inner client consumes the body.
  Future<Dash0GraphQLOperation?> _inspectRequest(
    AWSBaseHttpRequest request,
    Dash0HttpSpan? span,
  ) async {
    if (span == null || request.method != AWSHttpMethod.post) return null;
    try {
      final contentType = _header(request.headers, 'content-type');
      if (contentType == null || !contentType.toLowerCase().contains('json')) {
        return null;
      }
      return await Dash0GraphQL.inspectRequestBody(request.split());
    } catch (_) {
      return null;
    }
  }

  /// Reads GraphQL errors from a copy of a successful JSON response body.
  /// The caller's body is never read.
  Future<Dash0GraphQLErrors?> _inspectResponse(AWSBaseHttpResponse response) {
    try {
      final status = response.statusCode;
      final contentType = _header(response.headers, 'content-type');
      if (status < 200 ||
          status > 299 ||
          contentType == null ||
          !contentType.toLowerCase().contains('json')) {
        return Future.value();
      }
      return Dash0GraphQL.inspectResponse(
        response.split(),
        headers: response.headers,
        statusCode: status,
      );
    } catch (_) {
      return Future.value();
    }
  }

  static String? _header(Map<String, String> headers, String name) {
    for (final e in headers.entries) {
      if (e.key.toLowerCase() == name) return e.value;
    }
    return null;
  }

  Dash0HttpSpan? _startSpan(AWSBaseHttpRequest request) {
    try {
      final span = _starter(request.method.value, request.uri.toString());
      if (span == null) return null;
      try {
        request.headers.addAll(span.propagationHeaders());
        span.captureHeaders(request.headers, request: true);
      } catch (e) {
        debugPrint('Dash0: could not add trace headers: $e');
      }
      return span;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> close({bool force = false}) async {
    await _inner.close(force: force);
    await super.close(force: force);
  }
}
