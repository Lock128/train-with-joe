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

  String _languageEmoji(String code) {
    switch (code) {
      case 'en':
        return '🇬🇧';
      case 'de':
        return '🇩🇪';
      case 'es':
        return '🇪🇸';
      case 'ja':
        return '🇯🇵';
      case 'fr':
        return '🇫🇷';
      case 'pt':
        return '🇵🇹';
      default:
        return '🌐';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final localeProvider = context.watch<LocaleProvider>();
    final currentLocale = localeProvider.locale;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settings),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Language section
                _SectionHeader(
                  icon: Icons.translate_rounded,
                  title: l10n.language,
                ),
                const SizedBox(height: 10),
                Material(
                  color: colorScheme.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(14),
                  child: Column(
                    children: LocaleProvider.supportedLocales
                        .map((locale) {
                          final isSelected = locale.languageCode == currentLocale.languageCode;
                          return InkWell(
                            onTap: () => localeProvider.setLocale(Locale(locale.languageCode)),
                            borderRadius: BorderRadius.circular(14),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              child: Row(
                                children: [
                                  Text(
                                    _languageEmoji(locale.languageCode),
                                    style: const TextStyle(fontSize: 22),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      _languageLabel(locale, l10n),
                                      style: TextStyle(
                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                        color: isSelected ? colorScheme.primary : colorScheme.onSurface,
                                      ),
                                    ),
                                  ),
                                  if (isSelected)
                                    Container(
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        color: colorScheme.primary,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                                    ),
                                ],
                              ),
                            ),
                          );
                        })
                        .toList(),
                  ),
                ),
                const SizedBox(height: 24),

                // Training sounds section
                _SectionHeader(
                  icon: _soundMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                  title: l10n.trainingSounds,
                ),
                const SizedBox(height: 10),
                Material(
                  color: colorScheme.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(14),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.trainingSounds,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _soundMuted
                                    ? 'Sound effects are muted'
                                    : 'Play sounds during training',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Switch.adaptive(
                          value: !_soundMuted,
                          activeTrackColor: colorScheme.primary,
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

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, color: colorScheme.primary, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.primary,
              ),
        ),
      ],
    );
  }
}
