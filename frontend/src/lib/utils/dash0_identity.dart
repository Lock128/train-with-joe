/// Maps the signed-in user to the Dash0 session identity.
///
/// Train with Joe is a children's vocabulary app, so only the Cognito user ID
/// is sent. Email addresses, names and roles are never passed to Dash0.
library;

import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter/foundation.dart';

/// Signature of `Dash0.identify`, injectable for tests. Deliberately has no
/// email, name or roles parameters.
typedef Dash0IdentifyFn = void Function(String? id);

void _defaultIdentify(String? id) => Dash0.identify(id);

String? _clean(String? value) {
  final v = value?.trim();
  return (v == null || v.isEmpty) ? null : v;
}

/// Identifies the Dash0 session with the Cognito [userId]. A null or blank
/// [userId] clears the identity instead.
///
/// Never throws: telemetry failures must not affect authentication.
void identifyDash0User(
  String? userId, {
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) {
  try {
    identify(_clean(userId));
  } catch (e) {
    debugPrint('Dash0: identify failed: $e');
  }
}

/// Clears the Dash0 session identity (sign-out or invalid session).
void clearDash0User({
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) => identifyDash0User(null, identify: identify);
