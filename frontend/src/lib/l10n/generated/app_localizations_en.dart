// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Train with Joe';

  @override
  String get home => 'Home';

  @override
  String get scan => 'Scan';

  @override
  String get lists => 'Lists';

  @override
  String get training => 'Training';

  @override
  String get statistics => 'Statistics';

  @override
  String get subscription => 'Subscription';

  @override
  String get info => 'Info';

  @override
  String get settings => 'Settings';

  @override
  String get signOut => 'Sign Out';

  @override
  String get welcome => 'Welcome!';

  @override
  String get quickActions => 'Quick Actions';

  @override
  String get scanImageForVocabulary => 'Scan Image for Vocabulary';

  @override
  String get myVocabularyLists => 'My Vocabulary Lists';

  @override
  String get myTrainings => 'My Trainings';

  @override
  String get manageSubscription => 'Manage Subscription';

  @override
  String get noActiveSubscription => 'No active subscription';

  @override
  String subscriptionStatus(String status) {
    return 'Status: $status';
  }

  @override
  String tierLabel(String tier) {
    return 'Tier: $tier';
  }

  @override
  String get tierFree => 'Free';

  @override
  String get tierBasic => 'Basic';

  @override
  String get tierPro => 'Pro';

  @override
  String get errorLoadingUserData => 'Error loading user data';

  @override
  String get retry => 'Retry';

  @override
  String get language => 'Language';

  @override
  String get trainingSounds => 'Training sounds';

  @override
  String get enableTrainingSounds => 'Enable training sounds';

  @override
  String get appInfo => 'App Info';

  @override
  String get frontend => 'Frontend';

  @override
  String get backend => 'Backend';

  @override
  String get commitId => 'Commit ID';

  @override
  String get buildNumber => 'Build Number';

  @override
  String get failedToLoadBackendInfo => 'Failed to load backend info';

  @override
  String get configurationError => 'Configuration Error';

  @override
  String get abortTraining => 'Abort Training?';

  @override
  String get abortTrainingMessage =>
      'Your progress in this session will be lost.';

  @override
  String get continueText => 'Continue';

  @override
  String get abort => 'Abort';

  @override
  String wordProgress(int current, int total) {
    return 'Word $current of $total';
  }

  @override
  String get yourAnswer => 'Your answer';

  @override
  String get typeTheTranslation => 'Type the translation';

  @override
  String get submit => 'Submit';

  @override
  String get muteSounds => 'Mute sounds';

  @override
  String get unmuteSounds => 'Unmute sounds';

  @override
  String get english => 'English';

  @override
  String get german => 'German';

  @override
  String get spanish => 'Spanish';

  @override
  String get japanese => 'Japanese';

  @override
  String get french => 'French';

  @override
  String get portuguese => 'Portuguese';

  @override
  String get createTraining => 'Create Training';

  @override
  String get startTraining => 'Start Training';

  @override
  String get trainingHistory => 'Training History';

  @override
  String get results => 'Results';

  @override
  String get analyzeImagesForVocabulary => 'Analyze Images for Vocabulary';

  @override
  String get analyzeAnImage => 'Analyze an Image';

  @override
  String get vocabularyList => 'Vocabulary List';

  @override
  String get listNotFound => 'List not found';

  @override
  String get trainingNotFound => 'Training not found';

  @override
  String get executionNotFound => 'Execution not found';

  @override
  String get noVocabularyListsAvailable => 'No vocabulary lists available';

  @override
  String get createVocabularyListsFirst =>
      'Create vocabulary lists first to build a training.';

  @override
  String get noVocabularyListsYet => 'No vocabulary lists yet';

  @override
  String get analyzeImageToCreate =>
      'Analyze an image to create your first vocabulary list!';

  @override
  String get errorLoadingVocabularyLists => 'Error loading vocabulary lists';

  @override
  String get noTrainingsYet => 'No trainings yet';

  @override
  String get createFirstTraining => 'Create a training to start practicing!';

  @override
  String get errorLoadingTrainings => 'Error loading trainings';

  @override
  String get trainingName => 'Training Name (optional)';

  @override
  String get enterTrainingName => 'Enter a name for your training';

  @override
  String get trainingMode => 'Training Mode';

  @override
  String get textInput => 'Text Input';

  @override
  String get multipleChoice => 'Multiple Choice';

  @override
  String get aiTraining => 'AI Training';

  @override
  String get trainingDirection => 'Training Direction';

  @override
  String get wordToTranslation => 'Word → Translation';

  @override
  String get translationToWord => 'Translation → Word';

  @override
  String get yourVocabularyLists => 'Your Vocabulary Lists';

  @override
  String get publicVocabularyLists => 'Public Vocabulary Lists';

  @override
  String get searchLists => 'Search lists';

  @override
  String get searchListsHint =>
      'Title, publisher, school, grade, ISBN, language…';

  @override
  String get noListsYet => 'You have no vocabulary lists yet.';

  @override
  String get noListsMatchSearch => 'No lists match your search.';

  @override
  String get noTrainingsMatchFilters => 'No trainings match your filters';

  @override
  String get clearFilters => 'Clear filters';

  @override
  String numberOfWords(int count) {
    return 'Number of Words: $count';
  }

  @override
  String wordsAvailable(int count) {
    return '$count words available across selected lists';
  }

  @override
  String maxWordsPicked(int count) {
    return '$count words available across selected lists (max 100 will be randomly picked)';
  }

  @override
  String get randomizedMode => 'Randomized Mode';

  @override
  String get randomizedModeDescription =>
      'Pick different words each time you start this training';

  @override
  String get wordRemoved => 'Word removed';

  @override
  String get failedToRemoveWord => 'Failed to remove word';

  @override
  String get renameTraining => 'Rename Training';

  @override
  String get cancel => 'Cancel';

  @override
  String get rename => 'Rename';

  @override
  String get deleteTraining => 'Delete Training';

  @override
  String get deleteTrainingConfirm =>
      'Are you sure you want to delete this training? This cannot be undone.';

  @override
  String get delete => 'Delete';

  @override
  String get failedToDeleteTraining => 'Failed to delete training';

  @override
  String get addWords => 'Add Words';

  @override
  String addCount(int count) {
    return 'Add $count';
  }

  @override
  String get renameList => 'Rename List';

  @override
  String get save => 'Save';

  @override
  String get languages => 'Languages';

  @override
  String get none => 'None';

  @override
  String get bookDetails => 'Book Details';

  @override
  String get deleteList => 'Delete List';

  @override
  String deleteListConfirm(String title) {
    return 'Delete \"$title\"? This cannot be undone.';
  }

  @override
  String get editWord => 'Edit Word';

  @override
  String get addWord => 'Add Word';

  @override
  String get add => 'Add';

  @override
  String get deleteWord => 'Delete Word';

  @override
  String deleteWordConfirm(String word) {
    return 'Remove \"$word\" from this list?';
  }

  @override
  String get exportAsText => 'Export as text';

  @override
  String get pickFromGallery => 'Pick from Gallery';

  @override
  String get takePhoto => 'Take Photo';

  @override
  String get addMore => 'Add More';

  @override
  String get autoDetect => 'Auto-detect';

  @override
  String get goToVocabularyLists => 'Go to Vocabulary Lists';

  @override
  String nWords(int count) {
    return '$count words';
  }

  @override
  String failedToPickImages(String error) {
    return 'Failed to pick images: $error';
  }

  @override
  String failedToTakePhoto(String error) {
    return 'Failed to take photo: $error';
  }

  @override
  String get cancelSubscription => 'Cancel Subscription';

  @override
  String get cancelSubscriptionConfirm =>
      'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.';

  @override
  String get keepSubscription => 'Keep Subscription';

  @override
  String get subscriptionCreated => 'Subscription created successfully!';

  @override
  String purchaseFailed(String error) {
    return 'Purchase failed: $error';
  }

  @override
  String get restoringPurchases => 'Restoring purchases...';

  @override
  String get purchasesRestored => 'Purchases restored successfully!';

  @override
  String failedToRestorePurchases(String error) {
    return 'Failed to restore purchases: $error';
  }

  @override
  String get restorePurchases => 'Restore Purchases';

  @override
  String get subscribe => 'Subscribe';

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
  String get tryAgain => 'Try Again';

  @override
  String get backToTraining => 'Back to Training';

  @override
  String overallAccuracy(int percent) {
    return 'Overall accuracy: $percent%';
  }

  @override
  String get wordFlaggedForReview => 'Word flagged for review';

  @override
  String get statusAnalyzing => 'Analyzing images…';

  @override
  String get statusFailed => 'Analysis failed';

  @override
  String get statusPartiallyCompleted => 'Some images could not be analyzed';

  @override
  String get allModes => 'All modes';

  @override
  String get allLists => 'All lists';

  @override
  String get forceRemoveTraining => 'Force Remove Training';

  @override
  String forceRemoveConfirm(String name) {
    return 'Remove \"$name\" from the list? This will also attempt to delete it from the server.';
  }

  @override
  String removedTraining(String name) {
    return 'Removed \"$name\"';
  }

  @override
  String get admin => 'Admin';

  @override
  String get accessDenied => 'Access denied';

  @override
  String get load => 'Load';

  @override
  String get noDataAvailable => 'No data available';

  @override
  String get confirmMigration => 'Confirm Migration';

  @override
  String get sourceAndTargetMustDiffer =>
      'Source and target user must be different.';

  @override
  String get migrate => 'Migrate';

  @override
  String get alreadyHaveAccount => 'Already have an account? Sign In';

  @override
  String get haveVerificationCode => 'Have a verification code?';

  @override
  String get backToSignIn => 'Back to Sign In';

  @override
  String get gettingStarted => 'Getting Started';

  @override
  String get gettingStartedSubtitle =>
      'Not sure where to begin? Here are a few ideas:';

  @override
  String get gettingStartedTryPublicLists => 'Try a test with existing lists';

  @override
  String get gettingStartedTryPublicListsDesc =>
      'Browse public vocabulary lists and start a training right away';

  @override
  String get gettingStartedScanVocabulary => 'Scan your own vocabularies';

  @override
  String get gettingStartedScanVocabularyDesc =>
      'Take a photo of your textbook or notes to create a vocabulary list';

  @override
  String get gettingStartedChangeLanguage => 'Change your language';

  @override
  String get gettingStartedChangeLanguageDesc =>
      'Switch the app language in settings to match your preference';

  @override
  String get gettingStartedExploreTraining => 'Explore training modes';

  @override
  String get gettingStartedExploreTrainingDesc =>
      'Choose between text input, multiple choice, or AI-powered training';

  @override
  String get deleteAccount => 'Delete Account';

  @override
  String get deleteAccountConfirm =>
      'Are you sure you want to delete your account? This will permanently remove all your data including vocabulary lists, trainings, and subscription records. This action cannot be undone.';

  @override
  String get deleteAccountFinalConfirm => 'Final Confirmation';

  @override
  String get deleteAccountTypeDelete =>
      'Type DELETE to confirm permanent account deletion.';

  @override
  String get deleteAccountFailed =>
      'Failed to delete account. Please try again.';

  @override
  String get parentalGateTitle => 'Grown-Ups Only';

  @override
  String get parentalGateDescription =>
      'Ask a parent or guardian to solve this to continue:';

  @override
  String get parentalGateWrongAnswer => 'That\'s not right. Try again.';

  @override
  String get parentalGateCooldown => 'Too many attempts. Please wait…';

  @override
  String get parentalGateAnswerLabel => 'Answer';
}
