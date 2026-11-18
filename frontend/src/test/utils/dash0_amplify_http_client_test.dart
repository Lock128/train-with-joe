import 'dart:async';
import 'dart:convert';

import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:train_with_joe/utils/dash0_amplify_http_client.dart';

class _FakeInner extends AWSCustomHttpClient {
  _FakeInner({
    this.status = 200,
    this.error,
    this.responseBody,
    this.responseHeaders,
  });
  final int status;
  final String? responseBody;
  final Map<String, String>? responseHeaders;
  List<int>? requestBytes;
  final Object? error;
  AWSBaseHttpRequest? last;
  bool closed = false;
  bool manual = false;
  final pending = CancelableCompleter<AWSBaseHttpResponse>();

  @override
  AWSHttpOperation send(
    AWSBaseHttpRequest request, {
    FutureOr<void> Function()? onCancel,
  }) {
    last = request;
    if (request is AWSStreamedHttpRequest) {
      // Like a real client: consume the body after send() was called.
      request.body
          .fold<List<int>>(<int>[], (a, b) => a..addAll(b))
          .then((bytes) => requestBytes = bytes);
    }
    if (manual) {
      return AWSHttpOperation(
        pending.operation,
        requestProgress: const Stream<int>.empty(),
        responseProgress: const Stream<int>.empty(),
      );
    }
    final completer = CancelableCompleter<AWSBaseHttpResponse>();
    if (error != null) {
      completer.completeError(error!);
    } else {
      completer.complete(
        responseBody == null
            ? AWSHttpResponse(
                statusCode: status,
                headers: {'content-length': '5'},
              )
            : AWSStreamedHttpResponse(
                statusCode: status,
                headers: responseHeaders ?? const {},
                body: Stream.value(utf8.encode(responseBody!)),
              ),
      );
    }
    return AWSHttpOperation(
      completer.operation,
      requestProgress: const Stream<int>.empty(),
      responseProgress: const Stream<int>.empty(),
    );
  }

  @override
  Future<void> close({bool force = false}) async {
    closed = true;
    await super.close(force: force);
  }
}

class _Transport implements Dash0Transport {
  final spans = <Map<String, Object?>>[];

  @override
  Future<void> send(String path, Map<String, Object?> body) async {
    if (path != '/v1/traces') return;
    for (final rs in body['resourceSpans']! as List) {
      for (final ss in (rs as Map)['scopeSpans'] as List) {
        spans.addAll(((ss as Map)['spans'] as List).cast());
      }
    }
  }

  @override
  void close() {}
}

AWSHttpRequest _req() => AWSHttpRequest(
  method: AWSHttpMethod.post,
  uri: Uri.parse('https://api.example.com/graphql'),
  body: [1],
);

const _json = {'content-type': 'application/json'};

AWSStreamedHttpRequest _gql(String query, {Map<String, String>? headers}) =>
    AWSStreamedHttpRequest.post(
      Uri.parse('https://api.example.com/graphql'),
      body: HttpPayload.json({
        'variables': {'secret': 'x'},
        'query': query,
      }),
      headers: headers ?? const {},
    );

Future<String> _read(AWSBaseHttpResponse r) async =>
    utf8.decode(await r.body.expand((e) => e).toList());

Object? _attr(Map<String, Object?> span, String key) {
  for (final kv in (span['attributes']! as List).cast<Map>()) {
    if (kv['key'] == key) return (kv['value'] as Map).values.first;
  }
  return null;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('is a passthrough while the SDK is not initialized', () async {
    final inner = _FakeInner(status: 201);
    final client = Dash0AmplifyHttpClient(inner: inner);
    final response = await client.send(_req()).response;
    expect(response.statusCode, 201);
    expect(inner.last, isNotNull);
  });

  group('with initialized SDK', () {
    late _Transport transport;

    setUp(() async {
      transport = _Transport();
      await Dash0.init(
        const Dash0Options(
          serviceName: 'test',
          endpoint: Dash0Endpoint(url: 'https://x.example.com', authToken: 't'),
          enabledInstrumentations: {Dash0Instrumentation.http},
          propagators: [],
        ),
        transport: transport,
      );
    });

    tearDown(() async => Dash0.shutdown());

    test('creates a client span with the response status', () async {
      final inner = _FakeInner(status: 200);
      final client = Dash0AmplifyHttpClient(inner: inner);
      final response = await client.send(_req()).response;
      expect(response.statusCode, 200);
      await Future<void>.delayed(Duration.zero);
      await Dash0.flush();
      expect(transport.spans, hasLength(1));
      expect(_attr(transport.spans.single, 'http.response.status_code'), '200');
    });

    test('marks 5xx responses as errors', () async {
      final client = Dash0AmplifyHttpClient(inner: _FakeInner(status: 503));
      await client.send(_req()).response;
      await Future<void>.delayed(Duration.zero);
      await Dash0.flush();
      expect((transport.spans.single['status']! as Map)['code'], 2);
    });

    test('records failures and rethrows them to the caller', () async {
      final client = Dash0AmplifyHttpClient(
        inner: _FakeInner(error: const NetworkException('offline')),
      );
      await expectLater(
        client.send(_req()).response,
        throwsA(isA<NetworkException>()),
      );
      await Future<void>.delayed(Duration.zero);
      await Dash0.flush();
      expect((transport.spans.single['status']! as Map)['code'], 2);
    });

    test('does not create spans when the starter returns null', () async {
      final inner = _FakeInner();
      final client = Dash0AmplifyHttpClient(
        inner: inner,
        starter: (_, _) => null,
      );
      await client.send(_req()).response;
      await Dash0.flush();
      expect(transport.spans, isEmpty);
      expect(inner.last!.headers.containsKey('traceparent'), isFalse);
    });

    test('ends the span with an error when the request is cancelled', () async {
      final inner = _FakeInner()..manual = true;
      final client = Dash0AmplifyHttpClient(inner: inner);
      client.send(_req());
      inner.pending.operation.cancel();
      await Future<void>.delayed(Duration.zero);
      await Dash0.flush();
      expect(transport.spans, hasLength(1));
      expect((transport.spans.single['status']! as Map)['code'], 2);
    });

    group('GraphQL', () {
      Future<Map<String, Object?>> run(
        AWSBaseHttpRequest request,
        _FakeInner inner,
      ) async {
        final client = Dash0AmplifyHttpClient(inner: inner);
        final response = await client.send(request).response;
        if (response is AWSStreamedHttpResponse) await _read(response);
        await Future<void>.delayed(const Duration(milliseconds: 20));
        await Dash0.flush();
        return transport.spans.single;
      }

      test('names the operation and keeps the request body intact', () async {
        const query = 'query ListPosts(\$a: Int) { posts { id } }';
        final request = _gql(query);
        final expected = utf8.encode(
          jsonEncode({
            'variables': {'secret': 'x'},
            'query': query,
          }),
        );
        final inner = _FakeInner();
        final span = await run(request, inner);
        expect(_attr(span, 'graphql.operation.name'), 'ListPosts');
        expect(_attr(span, 'graphql.operation.type'), 'query');
        expect(span['name'], 'HTTP POST ListPosts');
        expect(inner.requestBytes, expected);
        expect(await request.bodyBytes, expected);
      });

      test('mutations and anonymous queries', () async {
        var span = await run(_gql('mutation DoIt { x }'), _FakeInner());
        expect(_attr(span, 'graphql.operation.type'), 'mutation');
        expect(_attr(span, 'graphql.operation.name'), 'DoIt');
        await Dash0.flush();
        transport.spans.clear();
        span = await run(_gql('{ posts { id } }'), _FakeInner());
        expect(_attr(span, 'graphql.operation.name'), isNull);
        expect(_attr(span, 'graphql.operation.type'), 'query');
        expect(span['name'], 'HTTP POST');
      });

      test('200 with errors marks the span without the message', () async {
        const body =
            '{"data":null,"errors":[{"errorType":"Unauthorized","message":"secret-user-text"}]}';
        final inner = _FakeInner(responseBody: body, responseHeaders: _json);
        final span = await run(_gql('query Q { a }'), inner);
        expect((span['status']! as Map)['code'], 2);
        expect(_attr(span, 'error.type'), 'Unauthorized');
        expect(jsonEncode(span), isNot(contains('secret-user-text')));
      });

      test('response body stays readable by the caller', () async {
        const body = '{"data":{"a":1},"errors":[{"errorType":"E"}]}';
        final client = Dash0AmplifyHttpClient(
          inner: _FakeInner(responseBody: body, responseHeaders: _json),
        );
        final response = await client.send(_gql('query Q { a }')).response;
        expect(await _read(response), body);
      });

      test('successful GraphQL response stays ok', () async {
        final inner = _FakeInner(
          responseBody: '{"data":{"a":1}}',
          responseHeaders: _json,
        );
        final span = await run(_gql('query Q { a }'), inner);
        expect((span['status'] as Map?)?['code'], isNot(2));
        expect(_attr(span, 'error.type'), isNull);
      });

      test('non JSON and large responses are not inspected', () async {
        const body = '{"errors":[{"errorType":"E"}]}';
        var span = await run(
          _gql('query Q { a }'),
          _FakeInner(
            responseBody: body,
            responseHeaders: {'content-type': 'text/plain'},
          ),
        );
        expect(_attr(span, 'error.type'), isNull);
        transport.spans.clear();
        span = await run(
          _gql('query Q { a }'),
          _FakeInner(
            responseBody: body,
            responseHeaders: {
              ..._json,
              'content-length': '${10 * 1024 * 1024}',
            },
          ),
        );
        expect(_attr(span, 'error.type'), isNull);
      });

      test('non-GraphQL POSTs and non-JSON requests are not named', () async {
        var span = await run(_req(), _FakeInner());
        expect(_attr(span, 'graphql.operation.type'), isNull);
        transport.spans.clear();
        final textRequest = AWSStreamedHttpRequest.post(
          Uri.parse('https://api.example.com/x'),
          body: HttpPayload.string('query Q { a }'),
        );
        span = await run(textRequest, _FakeInner());
        expect(_attr(span, 'graphql.operation.name'), isNull);
      });
    });

    test('close closes the inner client', () async {
      final inner = _FakeInner();
      await Dash0AmplifyHttpClient(inner: inner).close();
      expect(inner.closed, isTrue);
    });

    test('a throwing starter does not break the request', () async {
      final client = Dash0AmplifyHttpClient(
        inner: _FakeInner(),
        starter: (_, _) => throw StateError('boom'),
      );
      expect((await client.send(_req()).response).statusCode, 200);
    });
  });

  group('with trace propagation', () {
    late _Transport transport;

    setUp(() async {
      transport = _Transport();
      await Dash0.init(
        Dash0Options(
          serviceName: 'test',
          endpoint: const Dash0Endpoint(
            url: 'https://x.example.com',
            authToken: 't',
          ),
          enabledInstrumentations: const {Dash0Instrumentation.http},
          propagators: [
            Dash0Propagator.traceparent([RegExp('.*')]),
          ],
        ),
        transport: transport,
      );
    });

    tearDown(() async => Dash0.shutdown());

    test('adds a traceparent header matching the span', () async {
      final inner = _FakeInner();
      await Dash0AmplifyHttpClient(inner: inner).send(_req()).response;
      await Future<void>.delayed(Duration.zero);
      await Dash0.flush();
      final header = inner.last!.headers['traceparent'];
      expect(header, isNotNull);
      final span = transport.spans.single;
      expect(header, contains(span['traceId']! as String));
      expect(header, contains(span['spanId']! as String));
    });
  });

  test('main wires Amplify API through the Dash0 client', () {
    expect(
      dash0AmplifyApiOptions().baseHttpClient,
      isA<Dash0AmplifyHttpClient>(),
    );
  });
}
