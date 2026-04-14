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

  @override
  String get createTraining => 'Training erstellen';

  @override
  String get startTraining => 'Training starten';

  @override
  String get trainingHistory => 'Trainingsverlauf';

  @override
  String get results => 'Ergebnisse';

  @override
  String get analyzeImagesForVocabulary => 'Bilder für Vokabeln analysieren';

  @override
  String get analyzeAnImage => 'Ein Bild analysieren';

  @override
  String get vocabularyList => 'Vokabelliste';

  @override
  String get listNotFound => 'Liste nicht gefunden';

  @override
  String get trainingNotFound => 'Training nicht gefunden';

  @override
  String get executionNotFound => 'Ausführung nicht gefunden';

  @override
  String get noVocabularyListsAvailable => 'Keine Vokabellisten verfügbar';

  @override
  String get createVocabularyListsFirst =>
      'Erstelle zuerst Vokabellisten, um ein Training zu erstellen.';

  @override
  String get noVocabularyListsYet => 'Noch keine Vokabellisten';

  @override
  String get analyzeImageToCreate =>
      'Analysiere ein Bild, um deine erste Vokabelliste zu erstellen!';

  @override
  String get errorLoadingVocabularyLists =>
      'Fehler beim Laden der Vokabellisten';

  @override
  String get noTrainingsYet => 'Noch keine Trainings';

  @override
  String get createFirstTraining =>
      'Erstelle ein Training, um mit dem Üben zu beginnen!';

  @override
  String get errorLoadingTrainings => 'Fehler beim Laden der Trainings';

  @override
  String get trainingName => 'Trainingsname (optional)';

  @override
  String get enterTrainingName => 'Name für dein Training eingeben';

  @override
  String get trainingMode => 'Trainingsmodus';

  @override
  String get textInput => 'Texteingabe';

  @override
  String get multipleChoice => 'Multiple Choice';

  @override
  String get aiTraining => 'KI-Training';

  @override
  String get trainingDirection => 'Trainingsrichtung';

  @override
  String get wordToTranslation => 'Wort → Übersetzung';

  @override
  String get translationToWord => 'Übersetzung → Wort';

  @override
  String get yourVocabularyLists => 'Deine Vokabellisten';

  @override
  String get publicVocabularyLists => 'Öffentliche Vokabellisten';

  @override
  String get searchLists => 'Listen durchsuchen';

  @override
  String get searchListsHint => 'Titel, Verlag, Schule, Klasse, ISBN, Sprache…';

  @override
  String get noListsYet => 'Du hast noch keine Vokabellisten.';

  @override
  String get noListsMatchSearch => 'Keine Listen entsprechen deiner Suche.';

  @override
  String get noTrainingsMatchFilters =>
      'Keine Trainings entsprechen deinen Filtern';

  @override
  String get clearFilters => 'Filter zurücksetzen';

  @override
  String numberOfWords(int count) {
    return 'Anzahl der Wörter: $count';
  }

  @override
  String wordsAvailable(int count) {
    return '$count Wörter in ausgewählten Listen verfügbar';
  }

  @override
  String maxWordsPicked(int count) {
    return '$count Wörter in ausgewählten Listen verfügbar (max. 100 werden zufällig ausgewählt)';
  }

  @override
  String get randomizedMode => 'Zufallsmodus';

  @override
  String get randomizedModeDescription =>
      'Wähle bei jedem Start dieses Trainings andere Wörter';

  @override
  String get wordRemoved => 'Wort entfernt';

  @override
  String get failedToRemoveWord => 'Wort konnte nicht entfernt werden';

  @override
  String get renameTraining => 'Training umbenennen';

  @override
  String get cancel => 'Abbrechen';

  @override
  String get rename => 'Umbenennen';

  @override
  String get deleteTraining => 'Training löschen';

  @override
  String get deleteTrainingConfirm =>
      'Möchtest du dieses Training wirklich löschen? Dies kann nicht rückgängig gemacht werden.';

  @override
  String get delete => 'Löschen';

  @override
  String get failedToDeleteTraining => 'Training konnte nicht gelöscht werden';

  @override
  String get addWords => 'Wörter hinzufügen';

  @override
  String addCount(int count) {
    return '$count hinzufügen';
  }

  @override
  String get renameList => 'Liste umbenennen';

  @override
  String get save => 'Speichern';

  @override
  String get languages => 'Sprachen';

  @override
  String get none => 'Keine';

  @override
  String get bookDetails => 'Buchdetails';

  @override
  String get deleteList => 'Liste löschen';

  @override
  String deleteListConfirm(String title) {
    return '\"$title\" löschen? Dies kann nicht rückgängig gemacht werden.';
  }

  @override
  String get editWord => 'Wort bearbeiten';

  @override
  String get addWord => 'Wort hinzufügen';

  @override
  String get add => 'Hinzufügen';

  @override
  String get deleteWord => 'Wort löschen';

  @override
  String deleteWordConfirm(String word) {
    return '\"$word\" aus dieser Liste entfernen?';
  }

  @override
  String get exportAsText => 'Als Text exportieren';

  @override
  String get pickFromGallery => 'Aus Galerie wählen';

  @override
  String get takePhoto => 'Foto aufnehmen';

  @override
  String get addMore => 'Weitere hinzufügen';

  @override
  String get autoDetect => 'Automatisch erkennen';

  @override
  String get goToVocabularyLists => 'Zu Vokabellisten';

  @override
  String nWords(int count) {
    return '$count Wörter';
  }

  @override
  String failedToPickImages(String error) {
    return 'Bilder konnten nicht ausgewählt werden: $error';
  }

  @override
  String failedToTakePhoto(String error) {
    return 'Foto konnte nicht aufgenommen werden: $error';
  }

  @override
  String get cancelSubscription => 'Abonnement kündigen';

  @override
  String get cancelSubscriptionConfirm =>
      'Möchtest du dein Abonnement wirklich kündigen? Du hast noch bis zum Ende deines Abrechnungszeitraums Zugang.';

  @override
  String get keepSubscription => 'Abonnement behalten';

  @override
  String get subscriptionCreated => 'Abonnement erfolgreich erstellt!';

  @override
  String purchaseFailed(String error) {
    return 'Kauf fehlgeschlagen: $error';
  }

  @override
  String get restoringPurchases => 'Käufe werden wiederhergestellt...';

  @override
  String get purchasesRestored => 'Käufe erfolgreich wiederhergestellt!';

  @override
  String failedToRestorePurchases(String error) {
    return 'Käufe konnten nicht wiederhergestellt werden: $error';
  }

  @override
  String get restorePurchases => 'Käufe wiederherstellen';

  @override
  String get subscribe => 'Abonnieren';

  @override
  String get tryAgain => 'Erneut versuchen';

  @override
  String get backToTraining => 'Zurück zum Training';

  @override
  String overallAccuracy(int percent) {
    return 'Gesamtgenauigkeit: $percent%';
  }

  @override
  String get wordFlaggedForReview => 'Wort zur Überprüfung markiert';

  @override
  String get statusAnalyzing => 'Bilder werden analysiert…';

  @override
  String get statusFailed => 'Analyse fehlgeschlagen';

  @override
  String get statusPartiallyCompleted =>
      'Einige Bilder konnten nicht analysiert werden';

  @override
  String get allModes => 'Alle Modi';

  @override
  String get allLists => 'Alle Listen';

  @override
  String get forceRemoveTraining => 'Training erzwungen entfernen';

  @override
  String forceRemoveConfirm(String name) {
    return '\"$name\" aus der Liste entfernen? Dies wird auch versuchen, es vom Server zu löschen.';
  }

  @override
  String removedTraining(String name) {
    return '\"$name\" entfernt';
  }

  @override
  String get admin => 'Admin';

  @override
  String get accessDenied => 'Zugriff verweigert';

  @override
  String get load => 'Laden';

  @override
  String get noDataAvailable => 'Keine Daten verfügbar';

  @override
  String get confirmMigration => 'Migration bestätigen';

  @override
  String get sourceAndTargetMustDiffer =>
      'Quell- und Zielbenutzer müssen unterschiedlich sein.';

  @override
  String get migrate => 'Migrieren';

  @override
  String get alreadyHaveAccount => 'Bereits ein Konto? Anmelden';

  @override
  String get haveVerificationCode => 'Bestätigungscode vorhanden?';

  @override
  String get backToSignIn => 'Zurück zur Anmeldung';

  @override
  String get gettingStarted => 'Erste Schritte';

  @override
  String get gettingStartedSubtitle =>
      'Nicht sicher, wo du anfangen sollst? Hier ein paar Ideen:';

  @override
  String get gettingStartedTryPublicLists => 'Teste mit vorhandenen Listen';

  @override
  String get gettingStartedTryPublicListsDesc =>
      'Durchstöbere öffentliche Vokabellisten und starte sofort ein Training';

  @override
  String get gettingStartedScanVocabulary => 'Scanne deine eigenen Vokabeln';

  @override
  String get gettingStartedScanVocabularyDesc =>
      'Fotografiere dein Lehrbuch oder deine Notizen, um eine Vokabelliste zu erstellen';

  @override
  String get gettingStartedChangeLanguage => 'Sprache ändern';

  @override
  String get gettingStartedChangeLanguageDesc =>
      'Wechsle die App-Sprache in den Einstellungen nach deinen Wünschen';

  @override
  String get gettingStartedExploreTraining => 'Trainingsmodi entdecken';

  @override
  String get gettingStartedExploreTrainingDesc =>
      'Wähle zwischen Texteingabe, Multiple Choice oder KI-gestütztem Training';
}
