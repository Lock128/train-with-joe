// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'Trainiere mit Joe';

  @override
  String get home => 'Startseite';

  @override
  String get scan => 'Scannen';

  @override
  String get lists => 'Listen';

  @override
  String get training => 'Training';

  @override
  String get statistics => 'Statistiken';

  @override
  String get subscription => 'Abonnement';

  @override
  String get info => 'Info';

  @override
  String get settings => 'Einstellungen';

  @override
  String get signOut => 'Abmelden';

  @override
  String get welcome => 'Willkommen!';

  @override
  String get quickActions => 'Schnellaktionen';

  @override
  String get scanImageForVocabulary => 'Bild für Vokabeln scannen';

  @override
  String get myVocabularyLists => 'Meine Vokabellisten';

  @override
  String get myTrainings => 'Meine Trainings';

  @override
  String get manageSubscription => 'Abonnement verwalten';

  @override
  String get noActiveSubscription => 'Kein aktives Abonnement';

  @override
  String subscriptionStatus(String status) {
    return 'Status: $status';
  }

  @override
  String get errorLoadingUserData => 'Fehler beim Laden der Benutzerdaten';

  @override
  String get retry => 'Erneut versuchen';

  @override
  String get language => 'Sprache';

  @override
  String get trainingSounds => 'Trainingstöne';

  @override
  String get enableTrainingSounds => 'Trainingstöne aktivieren';

  @override
  String get appInfo => 'App-Info';

  @override
  String get frontend => 'Frontend';

  @override
  String get backend => 'Backend';

  @override
  String get commitId => 'Commit-ID';

  @override
  String get buildNumber => 'Build-Nummer';

  @override
  String get failedToLoadBackendInfo =>
      'Backend-Info konnte nicht geladen werden';

  @override
  String get configurationError => 'Konfigurationsfehler';

  @override
  String get abortTraining => 'Training abbrechen?';

  @override
  String get abortTrainingMessage =>
      'Dein Fortschritt in dieser Sitzung geht verloren.';

  @override
  String get continueText => 'Weiter';

  @override
  String get abort => 'Abbrechen';

  @override
  String wordProgress(int current, int total) {
    return 'Wort $current von $total';
  }

  @override
  String get yourAnswer => 'Deine Antwort';

  @override
  String get typeTheTranslation => 'Übersetzung eingeben';

  @override
  String get submit => 'Absenden';

  @override
  String get muteSounds => 'Töne stumm schalten';

  @override
  String get unmuteSounds => 'Töne einschalten';

  @override
  String get english => 'Englisch';

  @override
  String get german => 'Deutsch';

  @override
  String get spanish => 'Spanisch';

  @override
  String get japanese => 'Japanisch';

  @override
  String get french => 'Französisch';

  @override
  String get portuguese => 'Portugiesisch';
}
