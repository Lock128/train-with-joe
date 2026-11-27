/// Persistent key value store for the Dash0 session id.
///
/// The SDK default (`SharedPreferencesAsync`) can silently fail to persist on
/// some web setups, which makes every page load or app resume start a new RUM
/// session (one user showed up with 70 sessions in a day). This store uses the
/// same `SharedPreferences` the app already relies on for locale and theme,
/// and keeps values in memory when persistent storage throws, so a session
/// still lasts for the whole app run.
library;

import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Loads the shared preferences instance. Injectable for tests.
typedef SharedPreferencesLoader = Future<SharedPreferences> Function();

class Dash0SessionStore implements Dash0KeyValueStore {
  Dash0SessionStore({SharedPreferencesLoader? loader})
    : _loader = loader ?? SharedPreferences.getInstance;

  final SharedPreferencesLoader _loader;
  final Map<String, String> _memory = {};

  @override
  Future<String?> get(String key) async {
    try {
      final prefs = await _loader();
      return prefs.getString(key) ?? _memory[key];
    } catch (e) {
      debugPrint('Dash0: session store read failed: $e');
      return _memory[key];
    }
  }

  @override
  Future<void> set(String key, String value) async {
    _memory[key] = value;
    try {
      final prefs = await _loader();
      await prefs.setString(key, value);
    } catch (e) {
      debugPrint('Dash0: session store write failed: $e');
    }
  }

  @override
  Future<void> remove(String key) async {
    _memory.remove(key);
    try {
      final prefs = await _loader();
      await prefs.remove(key);
    } catch (e) {
      debugPrint('Dash0: session store remove failed: $e');
    }
  }
}
