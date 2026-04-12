/// Maps common language names/codes to flag emojis.
/// Falls back to the language name if no flag is found.
String languageToFlag(String? language) {
  if (language == null || language.isEmpty) return '';
  final key = language.toLowerCase().trim();
  return _languageFlagMap[key] ?? language;
}

const _languageFlagMap = <String, String>{
  // Full names
  'german': '🇩🇪',
  'english': '🇬🇧',
  'french': '🇫🇷',
  'spanish': '🇪🇸',
  'italian': '🇮🇹',
  'portuguese': '🇵🇹',
  'dutch': '🇳🇱',
  'polish': '🇵🇱',
  'russian': '🇷🇺',
  'chinese': '🇨🇳',
  'japanese': '🇯🇵',
  'korean': '🇰🇷',
  'arabic': '🇸🇦',
  'turkish': '🇹🇷',
  'hindi': '🇮🇳',
  'swedish': '🇸🇪',
  'norwegian': '🇳🇴',
  'danish': '🇩🇰',
  'finnish': '🇫🇮',
  'greek': '🇬🇷',
  'czech': '🇨🇿',
  'romanian': '🇷🇴',
  'hungarian': '🇭🇺',
  'ukrainian': '🇺🇦',
  'thai': '🇹🇭',
  'vietnamese': '🇻🇳',
  'indonesian': '🇮🇩',
  'malay': '🇲🇾',
  'hebrew': '🇮🇱',
  'persian': '🇮🇷',
  'latin': '🏛️',
  'croatian': '🇭🇷',
  'serbian': '🇷🇸',
  'bulgarian': '🇧🇬',
  'slovak': '🇸🇰',
  'slovenian': '🇸🇮',
  'estonian': '🇪🇪',
  'latvian': '🇱🇻',
  'lithuanian': '🇱🇹',
  'catalan': '🇪🇸',
  // ISO 639-1 codes
  'de': '🇩🇪',
  'en': '🇬🇧',
  'fr': '🇫🇷',
  'es': '🇪🇸',
  'it': '🇮🇹',
  'pt': '🇵🇹',
  'nl': '🇳🇱',
  'pl': '🇵🇱',
  'ru': '🇷🇺',
  'zh': '🇨🇳',
  'ja': '🇯🇵',
  'ko': '🇰🇷',
  'ar': '🇸🇦',
  'tr': '🇹🇷',
  'hi': '🇮🇳',
  'sv': '🇸🇪',
  'no': '🇳🇴',
  'da': '🇩🇰',
  'fi': '🇫🇮',
  'el': '🇬🇷',
  'cs': '🇨🇿',
  'ro': '🇷🇴',
  'hu': '🇭🇺',
  'uk': '🇺🇦',
  'th': '🇹🇭',
  'vi': '🇻🇳',
  'id': '🇮🇩',
  'ms': '🇲🇾',
  'he': '🇮🇱',
  'fa': '🇮🇷',
  'la': '🏛️',
  'hr': '🇭🇷',
  'sr': '🇷🇸',
  'bg': '🇧🇬',
  'sk': '🇸🇰',
  'sl': '🇸🇮',
  'et': '🇪🇪',
  'lv': '🇱🇻',
  'lt': '🇱🇹',
  'ca': '🇪🇸',
};

/// Builds a compact language display string like "🇩🇪 → 🇬🇧"
/// Returns null if no language info is available.
String? formatLanguagePair(String? sourceLanguage, String? targetLanguage) {
  final src = languageToFlag(sourceLanguage);
  final tgt = languageToFlag(targetLanguage);
  if (src.isEmpty && tgt.isEmpty) return null;
  if (src.isNotEmpty && tgt.isNotEmpty && src != tgt) return '$src → $tgt';
  if (src.isNotEmpty) return src;
  return tgt;
}
