/// Maps the signed-in user to the Dash0 session identity.
///
/// The Dash0 user id is the Cognito user id. The user name shown in Dash0 is
/// the profile display name when one exists. Only if the user has no display
/// name, the login (an email address) is used instead, and then only as the
/// `name`. The email is never sent as the Dash0 `email` field. Roles are never
/// sent. URLs are scrubbed of query strings separately.
library;

import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter/foundation.dart';

/// Signature of `Dash0.identify`, injectable for tests. Deliberately has no
/// email or roles parameters.
typedef Dash0IdentifyFn = void Function(String? id, {String? name, String? fullName});

void _defaultIdentify(String? id, {String? name, String? fullName}) =>
    Dash0.identify(id, name: name, fullName: fullName);

String? _currentUserId;
String? _currentDisplayName;
String? _currentLogin;

String? _clean(String? v) {
  final t = v?.trim();
  return (t == null || t.isEmpty) ? null : t;
}

void _send(Dash0IdentifyFn identify) {
  final id = _currentUserId;
  if (id == null) {
    identify(null);
    return;
  }
  final shown = _currentDisplayName ?? _currentLogin;
  identify(id, name: shown, fullName: shown == null ? null : '$shown ($id)');
}

/// Identifies the Dash0 session with the Cognito [userId]. A null or blank
/// [userId] clears the identity and the remembered names.
///
/// [displayName] is the profile name. [login] is the login identifier (email),
/// used as the name only when no display name is known. When either is omitted
/// for the same user, the previously set value is kept so auth refreshes do
/// not drop it.
///
/// Never throws: telemetry failures must not affect authentication.
void identifyDash0User(
  String? userId, {
  String? displayName,
  String? login,
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) {
  try {
    final id = _clean(userId);
    if (id == null) {
      _currentUserId = null;
      _currentDisplayName = null;
      _currentLogin = null;
    } else {
      if (id != _currentUserId) {
        _currentDisplayName = null;
        _currentLogin = null;
      }
      _currentUserId = id;
      _currentDisplayName = _clean(displayName) ?? _currentDisplayName;
      _currentLogin = _clean(login) ?? _currentLogin;
    }
    _send(identify);
  } catch (e) {
    debugPrint('Dash0: identify failed: $e');
  }
}

/// Sets the display name for the currently identified user (no-op if nobody is
/// identified or [displayName] is blank).
void setDash0DisplayName(
  String? displayName, {
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) {
  final id = _currentUserId;
  if (id == null || _clean(displayName) == null) return;
  identifyDash0User(id, displayName: displayName, identify: identify);
}

/// Clears the Dash0 session identity (sign-out or invalid session).
void clearDash0User({
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) => identifyDash0User(null, identify: identify);
