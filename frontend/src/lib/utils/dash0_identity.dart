/// Maps the signed-in user to the Dash0 session identity.
///
/// Train with Joe is a children's vocabulary app, so only the Cognito user ID
/// (and the `admin` role) is sent. Email addresses and names are never passed
/// to Dash0.
library;

import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter/foundation.dart';

/// Signature of `Dash0.identify`, injectable for tests. Deliberately has no
/// email or name parameters.
typedef Dash0IdentifyFn = void Function(String? id, {List<String>? roles});

void _defaultIdentify(String? id, {List<String>? roles}) =>
    Dash0.identify(id, roles: roles);

/// Roles reported to Dash0 for a user. Null when the user has no roles.
List<String>? dash0RolesFor({required bool isAdmin}) =>
    isAdmin ? const ['admin'] : null;

String? _clean(String? value) {
  final v = value?.trim();
  return (v == null || v.isEmpty) ? null : v;
}

String? _currentUserId;
bool _currentIsAdmin = false;

/// Identifies the Dash0 session with the Cognito [userId] and, for admins, the
/// `admin` role. A null or empty [userId] clears the identity instead.
///
/// When [userId] is the already identified user and [isAdmin] is null, the
/// previously known admin status is kept.
///
/// Never throws: telemetry failures must not affect authentication.
void identifyDash0User(
  String? userId, {
  bool? isAdmin,
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) {
  try {
    final id = _clean(userId);
    final sameUser = id != null && id == _currentUserId;
    _currentUserId = id;
    if (id == null) {
      _currentIsAdmin = false;
      identify(null);
      return;
    }
    if (!sameUser) _currentIsAdmin = false;
    _currentIsAdmin = isAdmin ?? _currentIsAdmin;
    identify(id, roles: dash0RolesFor(isAdmin: _currentIsAdmin));
  } catch (e) {
    debugPrint('Dash0: identify failed: $e');
  }
}

/// Clears the Dash0 session identity (sign-out or invalid session).
void clearDash0User({
  @visibleForTesting Dash0IdentifyFn identify = _defaultIdentify,
}) => identifyDash0User(null, identify: identify);
