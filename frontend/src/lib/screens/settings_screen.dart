import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../services/feedback_sound_service.dart';
import '../l10n/generated/app_localizations.dart';

/// Settings screen with language selection and training sounds toggle.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final FeedbackSoundService _soundService = FeedbackSoundService();
  late bool _soundMuted;

  @override
  void initState() {
    super.initState();
    _soundMuted = _soundService.isMuted;
  }

  /// Returns the display name for a locale in its own language.
  String _languageLabel(Locale locale, AppLocalizations l10n) {
    switch (locale.languageCode) {
      case 'en':
        return l10n.english;
      case 'de':
        return l10n.german;
      case 'es':
        return l10n.spanish;
      case 'ja':
        return l10n.japanese;
      case 'fr':
        return l10n.french;
      case 'pt':
        return l10n.portuguese;
      default:
        return locale.languageCode;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final localeProvider = context.watch<LocaleProvider>();
    final currentLocale =
        localeProvider.locale ?? Localizations.localeOf(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settings),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Language section
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.language,
                                color: Color(0xFF2B6CB0)),
                            const SizedBox(width: 12),
                            Text(l10n.language,
                                style:
                                    Theme.of(context).textTheme.titleMedium),
                          ],
                        ),
                        const Divider(),
                        ...LocaleProvider.supportedLocales.map((locale) {
                          final isSelected =
                              locale.languageCode == currentLocale.languageCode;
                          return RadioListTile<String>(
                            title: Text(_languageLabel(locale, l10n)),
                            value: locale.languageCode,
                            groupValue: currentLocale.languageCode,
                            onChanged: (_) =>
                                localeProvider.setLocale(locale),
                            dense: true,
                            activeColor: const Color(0xFF2B6CB0),
                            secondary: isSelected
                                ? const Icon(Icons.check,
                                    color: Color(0xFF2B6CB0))
                                : null,
                          );
                        }),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Training sounds section
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16.0, vertical: 8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              _soundMuted
                                  ? Icons.volume_off
                                  : Icons.volume_up,
                              color: const Color(0xFF2B6CB0),
                            ),
                            const SizedBox(width: 12),
                            Text(l10n.trainingSounds),
                          ],
                        ),
                        Switch.adaptive(
                          value: !_soundMuted,
                          onChanged: (enabled) {
                            setState(() => _soundMuted = !enabled);
                            _soundService.setMuted(!enabled);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
