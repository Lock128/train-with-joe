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
  String tierLabel(String tier) {
    return 'Niveau : $tier';
  }

  @override
  String get tierFree => 'Gratuit';

  @override
  String get tierBasic => 'Basique';

  @override
  String get tierPro => 'Pro';

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

  @override
  String get createTraining => 'Créer un entraînement';

  @override
  String get startTraining => 'Démarrer l\'entraînement';

  @override
  String get trainingHistory => 'Historique d\'entraînement';

  @override
  String get results => 'Résultats';

  @override
  String get analyzeImagesForVocabulary =>
      'Analyser des images pour le vocabulaire';

  @override
  String get analyzeAnImage => 'Analyser une image';

  @override
  String get vocabularyList => 'Liste de vocabulaire';

  @override
  String get listNotFound => 'Liste introuvable';

  @override
  String get trainingNotFound => 'Entraînement introuvable';

  @override
  String get executionNotFound => 'Exécution introuvable';

  @override
  String get noVocabularyListsAvailable =>
      'Aucune liste de vocabulaire disponible';

  @override
  String get createVocabularyListsFirst =>
      'Créez d\'abord des listes de vocabulaire pour créer un entraînement.';

  @override
  String get noVocabularyListsYet => 'Pas encore de listes de vocabulaire';

  @override
  String get analyzeImageToCreate =>
      'Analysez une image pour créer votre première liste de vocabulaire !';

  @override
  String get errorLoadingVocabularyLists =>
      'Erreur lors du chargement des listes de vocabulaire';

  @override
  String get noTrainingsYet => 'Pas encore d\'entraînements';

  @override
  String get createFirstTraining =>
      'Créez un entraînement pour commencer à pratiquer !';

  @override
  String get errorLoadingTrainings =>
      'Erreur lors du chargement des entraînements';

  @override
  String get trainingName => 'Nom de l\'entraînement (optionnel)';

  @override
  String get enterTrainingName => 'Entrez un nom pour votre entraînement';

  @override
  String get trainingMode => 'Mode d\'entraînement';

  @override
  String get textInput => 'Saisie de texte';

  @override
  String get multipleChoice => 'Choix multiple';

  @override
  String get aiTraining => 'Entraînement IA';

  @override
  String get trainingDirection => 'Direction de l\'entraînement';

  @override
  String get wordToTranslation => 'Mot → Traduction';

  @override
  String get translationToWord => 'Traduction → Mot';

  @override
  String get yourVocabularyLists => 'Vos listes de vocabulaire';

  @override
  String get publicVocabularyLists => 'Listes de vocabulaire publiques';

  @override
  String get searchLists => 'Rechercher des listes';

  @override
  String get searchListsHint => 'Titre, éditeur, école, classe, ISBN, langue…';

  @override
  String get noListsYet => 'Vous n\'avez pas encore de listes de vocabulaire.';

  @override
  String get noListsMatchSearch =>
      'Aucune liste ne correspond à votre recherche.';

  @override
  String get noTrainingsMatchFilters =>
      'Aucun entraînement ne correspond à vos filtres';

  @override
  String get clearFilters => 'Effacer les filtres';

  @override
  String numberOfWords(int count) {
    return 'Nombre de mots : $count';
  }

  @override
  String wordsAvailable(int count) {
    return '$count mots disponibles dans les listes sélectionnées';
  }

  @override
  String maxWordsPicked(int count) {
    return '$count mots disponibles dans les listes sélectionnées (max. 100 seront choisis au hasard)';
  }

  @override
  String get randomizedMode => 'Mode aléatoire';

  @override
  String get randomizedModeDescription =>
      'Choisir des mots différents à chaque démarrage de cet entraînement';

  @override
  String get wordRemoved => 'Mot supprimé';

  @override
  String get failedToRemoveWord => 'Impossible de supprimer le mot';

  @override
  String get renameTraining => 'Renommer l\'entraînement';

  @override
  String get cancel => 'Annuler';

  @override
  String get rename => 'Renommer';

  @override
  String get deleteTraining => 'Supprimer l\'entraînement';

  @override
  String get deleteTrainingConfirm =>
      'Êtes-vous sûr de vouloir supprimer cet entraînement ? Cette action est irréversible.';

  @override
  String get delete => 'Supprimer';

  @override
  String get failedToDeleteTraining =>
      'Impossible de supprimer l\'entraînement';

  @override
  String get addWords => 'Ajouter des mots';

  @override
  String addCount(int count) {
    return 'Ajouter $count';
  }

  @override
  String get renameList => 'Renommer la liste';

  @override
  String get save => 'Enregistrer';

  @override
  String get languages => 'Langues';

  @override
  String get none => 'Aucun';

  @override
  String get bookDetails => 'Détails du livre';

  @override
  String get deleteList => 'Supprimer la liste';

  @override
  String deleteListConfirm(String title) {
    return 'Supprimer \"$title\" ? Cette action est irréversible.';
  }

  @override
  String get editWord => 'Modifier le mot';

  @override
  String get addWord => 'Ajouter un mot';

  @override
  String get add => 'Ajouter';

  @override
  String get deleteWord => 'Supprimer le mot';

  @override
  String deleteWordConfirm(String word) {
    return 'Supprimer \"$word\" de cette liste ?';
  }

  @override
  String get exportAsText => 'Exporter en texte';

  @override
  String get pickFromGallery => 'Choisir dans la galerie';

  @override
  String get takePhoto => 'Prendre une photo';

  @override
  String get addMore => 'Ajouter plus';

  @override
  String get autoDetect => 'Détection automatique';

  @override
  String get goToVocabularyLists => 'Aller aux listes de vocabulaire';

  @override
  String nWords(int count) {
    return '$count mots';
  }

  @override
  String failedToPickImages(String error) {
    return 'Impossible de sélectionner les images : $error';
  }

  @override
  String failedToTakePhoto(String error) {
    return 'Impossible de prendre la photo : $error';
  }

  @override
  String get cancelSubscription => 'Annuler l\'abonnement';

  @override
  String get cancelSubscriptionConfirm =>
      'Êtes-vous sûr de vouloir annuler votre abonnement ? Vous aurez toujours accès jusqu\'à la fin de votre période de facturation.';

  @override
  String get keepSubscription => 'Garder l\'abonnement';

  @override
  String get subscriptionCreated => 'Abonnement créé avec succès !';

  @override
  String purchaseFailed(String error) {
    return 'Achat échoué : $error';
  }

  @override
  String get restoringPurchases => 'Restauration des achats...';

  @override
  String get purchasesRestored => 'Achats restaurés avec succès !';

  @override
  String failedToRestorePurchases(String error) {
    return 'Impossible de restaurer les achats : $error';
  }

  @override
  String get restorePurchases => 'Restaurer les achats';

  @override
  String get subscribe => 'S\'abonner';

  @override
  String get pricingLegalPrefix => 'By subscribing, you agree to our ';

  @override
  String get pricingTermsLink => 'Terms of Service';

  @override
  String get pricingLegalAnd => 'and';

  @override
  String get pricingPrivacyLink => 'Privacy Policy';

  @override
  String get pricingLegalSuffix => '.';

  @override
  String get tryAgain => 'Réessayer';

  @override
  String get backToTraining => 'Retour à l\'entraînement';

  @override
  String overallAccuracy(int percent) {
    return 'Précision globale : $percent%';
  }

  @override
  String get wordFlaggedForReview => 'Mot signalé pour révision';

  @override
  String get statusAnalyzing => 'Analyse des images en cours…';

  @override
  String get statusFailed => 'L\'analyse a échoué';

  @override
  String get statusPartiallyCompleted =>
      'Certaines images n\'ont pas pu être analysées';

  @override
  String get allModes => 'Tous les modes';

  @override
  String get allLists => 'Toutes les listes';

  @override
  String get forceRemoveTraining => 'Forcer la suppression de l\'entraînement';

  @override
  String forceRemoveConfirm(String name) {
    return 'Supprimer \"$name\" de la liste ? Cela tentera également de le supprimer du serveur.';
  }

  @override
  String removedTraining(String name) {
    return '\"$name\" supprimé';
  }

  @override
  String get admin => 'Admin';

  @override
  String get accessDenied => 'Accès refusé';

  @override
  String get load => 'Charger';

  @override
  String get noDataAvailable => 'Aucune donnée disponible';

  @override
  String get confirmMigration => 'Confirmer la migration';

  @override
  String get sourceAndTargetMustDiffer =>
      'L\'utilisateur source et cible doivent être différents.';

  @override
  String get migrate => 'Migrer';

  @override
  String get alreadyHaveAccount => 'Vous avez déjà un compte ? Se connecter';

  @override
  String get haveVerificationCode => 'Vous avez un code de vérification ?';

  @override
  String get backToSignIn => 'Retour à la connexion';

  @override
  String get gettingStarted => 'Pour commencer';

  @override
  String get gettingStartedSubtitle =>
      'Vous ne savez pas par où commencer ? Voici quelques idées :';

  @override
  String get gettingStartedTryPublicLists =>
      'Essayez avec des listes existantes';

  @override
  String get gettingStartedTryPublicListsDesc =>
      'Parcourez les listes de vocabulaire publiques et lancez un entraînement immédiatement';

  @override
  String get gettingStartedScanVocabulary => 'Scannez votre propre vocabulaire';

  @override
  String get gettingStartedScanVocabularyDesc =>
      'Prenez une photo de votre manuel ou de vos notes pour créer une liste de vocabulaire';

  @override
  String get gettingStartedChangeLanguage => 'Changez votre langue';

  @override
  String get gettingStartedChangeLanguageDesc =>
      'Modifiez la langue de l\'application dans les paramètres selon votre préférence';

  @override
  String get gettingStartedExploreTraining =>
      'Explorez les modes d\'entraînement';

  @override
  String get gettingStartedExploreTrainingDesc =>
      'Choisissez entre saisie de texte, choix multiple ou entraînement assisté par IA';

  @override
  String get deleteAccount => 'Supprimer le compte';

  @override
  String get deleteAccountConfirm =>
      'Êtes-vous sûr de vouloir supprimer votre compte ? Toutes vos données seront définitivement supprimées, y compris les listes de vocabulaire, les entraînements et les abonnements. Cette action est irréversible.';

  @override
  String get deleteAccountFinalConfirm => 'Confirmation finale';

  @override
  String get deleteAccountTypeDelete =>
      'Tapez DELETE pour confirmer la suppression définitive du compte.';

  @override
  String get deleteAccountFailed =>
      'Impossible de supprimer le compte. Veuillez réessayer.';

  @override
  String get parentalGateTitle => 'Réservé aux adultes';

  @override
  String get parentalGateDescription =>
      'Demandez à un parent ou tuteur de résoudre ceci pour continuer :';

  @override
  String get parentalGateWrongAnswer => 'Ce n\'est pas correct. Réessayez.';

  @override
  String get parentalGateCooldown => 'Trop de tentatives. Veuillez patienter…';

  @override
  String get parentalGateAnswerLabel => 'Réponse';
}
