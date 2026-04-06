// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'Entraîne-toi avec Joe';

  @override
  String get home => 'Accueil';

  @override
  String get scan => 'Scanner';

  @override
  String get lists => 'Listes';

  @override
  String get training => 'Entraînement';

  @override
  String get statistics => 'Statistiques';

  @override
  String get subscription => 'Abonnement';

  @override
  String get info => 'Info';

  @override
  String get settings => 'Paramètres';

  @override
  String get signOut => 'Déconnexion';

  @override
  String get welcome => 'Bienvenue !';

  @override
  String get quickActions => 'Actions rapides';

  @override
  String get scanImageForVocabulary => 'Scanner une image pour le vocabulaire';

  @override
  String get myVocabularyLists => 'Mes listes de vocabulaire';

  @override
  String get myTrainings => 'Mes entraînements';

  @override
  String get manageSubscription => 'Gérer l\'abonnement';

  @override
  String get noActiveSubscription => 'Aucun abonnement actif';

  @override
  String subscriptionStatus(String status) {
    return 'Statut : $status';
  }

  @override
  String get errorLoadingUserData => 'Erreur lors du chargement des données';

  @override
  String get retry => 'Réessayer';

  @override
  String get language => 'Langue';

  @override
  String get trainingSounds => 'Sons d\'entraînement';

  @override
  String get enableTrainingSounds => 'Activer les sons d\'entraînement';

  @override
  String get appInfo => 'Info de l\'app';

  @override
  String get frontend => 'Frontend';

  @override
  String get backend => 'Backend';

  @override
  String get commitId => 'ID de commit';

  @override
  String get buildNumber => 'Numéro de build';

  @override
  String get failedToLoadBackendInfo =>
      'Impossible de charger les infos du backend';

  @override
  String get configurationError => 'Erreur de configuration';

  @override
  String get abortTraining => 'Annuler l\'entraînement ?';

  @override
  String get abortTrainingMessage => 'Votre progression sera perdue.';

  @override
  String get continueText => 'Continuer';

  @override
  String get abort => 'Annuler';

  @override
  String wordProgress(int current, int total) {
    return 'Mot $current sur $total';
  }

  @override
  String get yourAnswer => 'Votre réponse';

  @override
  String get typeTheTranslation => 'Tapez la traduction';

  @override
  String get submit => 'Envoyer';

  @override
  String get muteSounds => 'Couper le son';

  @override
  String get unmuteSounds => 'Activer le son';

  @override
  String get english => 'Anglais';

  @override
  String get german => 'Allemand';

  @override
  String get spanish => 'Espagnol';

  @override
  String get japanese => 'Japonais';

  @override
  String get french => 'Français';

  @override
  String get portuguese => 'Portugais';
}
