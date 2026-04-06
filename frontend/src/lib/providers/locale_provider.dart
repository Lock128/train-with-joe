import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider for managing the app locale (language).
///
/// On first launch (no saved preference), picks the device locale if it's
/// one of the supported languages, otherwise falls back to English.
class LocaleProvider extends ChangeNotifier {
  static const _localeKey = 'app_locale';

  static const supportedLocales = [
    Locale('en'),
    Locale('de'),
    Locale('es'),
    Locale('ja'),
    Locale('fr'),
    Locale('pt'),
  ];

  static const _supportedCodes = {'en', 'de', 'es', 'ja', 'fr', 'pt'};

  Locale _locale = const Locale('en');

  /// The current effective locale (never null).
  Locale get locale => _locale;

  LocaleProvider() {
    _initLocale();
  }

  Future<void> _initLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_localeKey);

    if (saved != null && _supportedCodes.contains(saved)) {
      _locale = Locale(saved);
    } else {
      // Match device locale to a supported language, default to English.
      final deviceLocale = ui.PlatformDispatcher.instance.locale;
      _locale = _supportedCodes.contains(deviceLocale.languageCode)
          ? Locale(deviceLocale.languageCode)
          : const Locale('en');
    }
    notifyListeners();
  }

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, locale.languageCode);
    notifyListeners();
  }
}
