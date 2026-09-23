import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider for managing the app's theme mode (system / light / dark).
///
/// The selected mode is persisted in [SharedPreferences]. On first launch
/// (no saved preference) the app follows the device's system setting.
class ThemeProvider extends ChangeNotifier {
  static const _themeModeKey = 'app_theme_mode';

  ThemeMode _themeMode = ThemeMode.system;

  /// The current effective theme mode (never null).
  ThemeMode get themeMode => _themeMode;

  ThemeProvider() {
    _initThemeMode();
  }

  Future<void> _initThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_themeModeKey);
    _themeMode = _decode(saved);
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;
    _themeMode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_themeModeKey, _encode(mode));
  }

  static ThemeMode _decode(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  static String _encode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}
