import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_pt.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('ja'),
    Locale('pt'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Train with Joe'**
  String get appTitle;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @scan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get scan;

  /// No description provided for @lists.
  ///
  /// In en, this message translates to:
  /// **'Lists'**
  String get lists;

  /// No description provided for @training.
  ///
  /// In en, this message translates to:
  /// **'Training'**
  String get training;

  /// No description provided for @statistics.
  ///
  /// In en, this message translates to:
  /// **'Statistics'**
  String get statistics;

  /// No description provided for @subscription.
  ///
  /// In en, this message translates to:
  /// **'Subscription'**
  String get subscription;

  /// No description provided for @info.
  ///
  /// In en, this message translates to:
  /// **'Info'**
  String get info;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome!'**
  String get welcome;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get quickActions;

  /// No description provided for @scanImageForVocabulary.
  ///
  /// In en, this message translates to:
  /// **'Scan Image for Vocabulary'**
  String get scanImageForVocabulary;

  /// No description provided for @myVocabularyLists.
  ///
  /// In en, this message translates to:
  /// **'My Vocabulary Lists'**
  String get myVocabularyLists;

  /// No description provided for @myTrainings.
  ///
  /// In en, this message translates to:
  /// **'My Trainings'**
  String get myTrainings;

  /// No description provided for @manageSubscription.
  ///
  /// In en, this message translates to:
  /// **'Manage Subscription'**
  String get manageSubscription;

  /// No description provided for @noActiveSubscription.
  ///
  /// In en, this message translates to:
  /// **'No active subscription'**
  String get noActiveSubscription;

  /// No description provided for @subscriptionStatus.
  ///
  /// In en, this message translates to:
  /// **'Status: {status}'**
  String subscriptionStatus(String status);

  /// No description provided for @errorLoadingUserData.
  ///
  /// In en, this message translates to:
  /// **'Error loading user data'**
  String get errorLoadingUserData;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @trainingSounds.
  ///
  /// In en, this message translates to:
  /// **'Training sounds'**
  String get trainingSounds;

  /// No description provided for @enableTrainingSounds.
  ///
  /// In en, this message translates to:
  /// **'Enable training sounds'**
  String get enableTrainingSounds;

  /// No description provided for @appInfo.
  ///
  /// In en, this message translates to:
  /// **'App Info'**
  String get appInfo;

  /// No description provided for @frontend.
  ///
  /// In en, this message translates to:
  /// **'Frontend'**
  String get frontend;

  /// No description provided for @backend.
  ///
  /// In en, this message translates to:
  /// **'Backend'**
  String get backend;

  /// No description provided for @commitId.
  ///
  /// In en, this message translates to:
  /// **'Commit ID'**
  String get commitId;

  /// No description provided for @buildNumber.
  ///
  /// In en, this message translates to:
  /// **'Build Number'**
  String get buildNumber;

  /// No description provided for @failedToLoadBackendInfo.
  ///
  /// In en, this message translates to:
  /// **'Failed to load backend info'**
  String get failedToLoadBackendInfo;

  /// No description provided for @configurationError.
  ///
  /// In en, this message translates to:
  /// **'Configuration Error'**
  String get configurationError;

  /// No description provided for @abortTraining.
  ///
  /// In en, this message translates to:
  /// **'Abort Training?'**
  String get abortTraining;

  /// No description provided for @abortTrainingMessage.
  ///
  /// In en, this message translates to:
  /// **'Your progress in this session will be lost.'**
  String get abortTrainingMessage;

  /// No description provided for @continueText.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueText;

  /// No description provided for @abort.
  ///
  /// In en, this message translates to:
  /// **'Abort'**
  String get abort;

  /// No description provided for @wordProgress.
  ///
  /// In en, this message translates to:
  /// **'Word {current} of {total}'**
  String wordProgress(int current, int total);

  /// No description provided for @yourAnswer.
  ///
  /// In en, this message translates to:
  /// **'Your answer'**
  String get yourAnswer;

  /// No description provided for @typeTheTranslation.
  ///
  /// In en, this message translates to:
  /// **'Type the translation'**
  String get typeTheTranslation;

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @muteSounds.
  ///
  /// In en, this message translates to:
  /// **'Mute sounds'**
  String get muteSounds;

  /// No description provided for @unmuteSounds.
  ///
  /// In en, this message translates to:
  /// **'Unmute sounds'**
  String get unmuteSounds;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @german.
  ///
  /// In en, this message translates to:
  /// **'German'**
  String get german;

  /// No description provided for @spanish.
  ///
  /// In en, this message translates to:
  /// **'Spanish'**
  String get spanish;

  /// No description provided for @japanese.
  ///
  /// In en, this message translates to:
  /// **'Japanese'**
  String get japanese;

  /// No description provided for @french.
  ///
  /// In en, this message translates to:
  /// **'French'**
  String get french;

  /// No description provided for @portuguese.
  ///
  /// In en, this message translates to:
  /// **'Portuguese'**
  String get portuguese;

  /// No description provided for @createTraining.
  ///
  /// In en, this message translates to:
  /// **'Create Training'**
  String get createTraining;

  /// No description provided for @startTraining.
  ///
  /// In en, this message translates to:
  /// **'Start Training'**
  String get startTraining;

  /// No description provided for @trainingHistory.
  ///
  /// In en, this message translates to:
  /// **'Training History'**
  String get trainingHistory;

  /// No description provided for @results.
  ///
  /// In en, this message translates to:
  /// **'Results'**
  String get results;

  /// No description provided for @analyzeImagesForVocabulary.
  ///
  /// In en, this message translates to:
  /// **'Analyze Images for Vocabulary'**
  String get analyzeImagesForVocabulary;

  /// No description provided for @analyzeAnImage.
  ///
  /// In en, this message translates to:
  /// **'Analyze an Image'**
  String get analyzeAnImage;

  /// No description provided for @vocabularyList.
  ///
  /// In en, this message translates to:
  /// **'Vocabulary List'**
  String get vocabularyList;

  /// No description provided for @listNotFound.
  ///
  /// In en, this message translates to:
  /// **'List not found'**
  String get listNotFound;

  /// No description provided for @trainingNotFound.
  ///
  /// In en, this message translates to:
  /// **'Training not found'**
  String get trainingNotFound;

  /// No description provided for @executionNotFound.
  ///
  /// In en, this message translates to:
  /// **'Execution not found'**
  String get executionNotFound;

  /// No description provided for @noVocabularyListsAvailable.
  ///
  /// In en, this message translates to:
  /// **'No vocabulary lists available'**
  String get noVocabularyListsAvailable;

  /// No description provided for @createVocabularyListsFirst.
  ///
  /// In en, this message translates to:
  /// **'Create vocabulary lists first to build a training.'**
  String get createVocabularyListsFirst;

  /// No description provided for @noVocabularyListsYet.
  ///
  /// In en, this message translates to:
  /// **'No vocabulary lists yet'**
  String get noVocabularyListsYet;

  /// No description provided for @analyzeImageToCreate.
  ///
  /// In en, this message translates to:
  /// **'Analyze an image to create your first vocabulary list!'**
  String get analyzeImageToCreate;

  /// No description provided for @errorLoadingVocabularyLists.
  ///
  /// In en, this message translates to:
  /// **'Error loading vocabulary lists'**
  String get errorLoadingVocabularyLists;

  /// No description provided for @noTrainingsYet.
  ///
  /// In en, this message translates to:
  /// **'No trainings yet'**
  String get noTrainingsYet;

  /// No description provided for @createFirstTraining.
  ///
  /// In en, this message translates to:
  /// **'Create a training to start practicing!'**
  String get createFirstTraining;

  /// No description provided for @errorLoadingTrainings.
  ///
  /// In en, this message translates to:
  /// **'Error loading trainings'**
  String get errorLoadingTrainings;

  /// No description provided for @trainingName.
  ///
  /// In en, this message translates to:
  /// **'Training Name (optional)'**
  String get trainingName;

  /// No description provided for @enterTrainingName.
  ///
  /// In en, this message translates to:
  /// **'Enter a name for your training'**
  String get enterTrainingName;

  /// No description provided for @trainingMode.
  ///
  /// In en, this message translates to:
  /// **'Training Mode'**
  String get trainingMode;

  /// No description provided for @textInput.
  ///
  /// In en, this message translates to:
  /// **'Text Input'**
  String get textInput;

  /// No description provided for @multipleChoice.
  ///
  /// In en, this message translates to:
  /// **'Multiple Choice'**
  String get multipleChoice;

  /// No description provided for @aiTraining.
  ///
  /// In en, this message translates to:
  /// **'AI Training'**
  String get aiTraining;

  /// No description provided for @trainingDirection.
  ///
  /// In en, this message translates to:
  /// **'Training Direction'**
  String get trainingDirection;

  /// No description provided for @wordToTranslation.
  ///
  /// In en, this message translates to:
  /// **'Word → Translation'**
  String get wordToTranslation;

  /// No description provided for @translationToWord.
  ///
  /// In en, this message translates to:
  /// **'Translation → Word'**
  String get translationToWord;

  /// No description provided for @yourVocabularyLists.
  ///
  /// In en, this message translates to:
  /// **'Your Vocabulary Lists'**
  String get yourVocabularyLists;

  /// No description provided for @publicVocabularyLists.
  ///
  /// In en, this message translates to:
  /// **'Public Vocabulary Lists'**
  String get publicVocabularyLists;

  /// No description provided for @searchLists.
  ///
  /// In en, this message translates to:
  /// **'Search lists'**
  String get searchLists;

  /// No description provided for @searchListsHint.
  ///
  /// In en, this message translates to:
  /// **'Title, publisher, school, grade, ISBN, language…'**
  String get searchListsHint;

  /// No description provided for @noListsYet.
  ///
  /// In en, this message translates to:
  /// **'You have no vocabulary lists yet.'**
  String get noListsYet;

  /// No description provided for @noListsMatchSearch.
  ///
  /// In en, this message translates to:
  /// **'No lists match your search.'**
  String get noListsMatchSearch;

  /// No description provided for @noTrainingsMatchFilters.
  ///
  /// In en, this message translates to:
  /// **'No trainings match your filters'**
  String get noTrainingsMatchFilters;

  /// No description provided for @clearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get clearFilters;

  /// No description provided for @numberOfWords.
  ///
  /// In en, this message translates to:
  /// **'Number of Words: {count}'**
  String numberOfWords(int count);

  /// No description provided for @wordsAvailable.
  ///
  /// In en, this message translates to:
  /// **'{count} words available across selected lists'**
  String wordsAvailable(int count);

  /// No description provided for @maxWordsPicked.
  ///
  /// In en, this message translates to:
  /// **'{count} words available across selected lists (max 100 will be randomly picked)'**
  String maxWordsPicked(int count);

  /// No description provided for @randomizedMode.
  ///
  /// In en, this message translates to:
  /// **'Randomized Mode'**
  String get randomizedMode;

  /// No description provided for @randomizedModeDescription.
  ///
  /// In en, this message translates to:
  /// **'Pick different words each time you start this training'**
  String get randomizedModeDescription;

  /// No description provided for @wordRemoved.
  ///
  /// In en, this message translates to:
  /// **'Word removed'**
  String get wordRemoved;

  /// No description provided for @failedToRemoveWord.
  ///
  /// In en, this message translates to:
  /// **'Failed to remove word'**
  String get failedToRemoveWord;

  /// No description provided for @renameTraining.
  ///
  /// In en, this message translates to:
  /// **'Rename Training'**
  String get renameTraining;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @rename.
  ///
  /// In en, this message translates to:
  /// **'Rename'**
  String get rename;

  /// No description provided for @deleteTraining.
  ///
  /// In en, this message translates to:
  /// **'Delete Training'**
  String get deleteTraining;

  /// No description provided for @deleteTrainingConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this training? This cannot be undone.'**
  String get deleteTrainingConfirm;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @failedToDeleteTraining.
  ///
  /// In en, this message translates to:
  /// **'Failed to delete training'**
  String get failedToDeleteTraining;

  /// No description provided for @addWords.
  ///
  /// In en, this message translates to:
  /// **'Add Words'**
  String get addWords;

  /// No description provided for @addCount.
  ///
  /// In en, this message translates to:
  /// **'Add {count}'**
  String addCount(int count);

  /// No description provided for @renameList.
  ///
  /// In en, this message translates to:
  /// **'Rename List'**
  String get renameList;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @languages.
  ///
  /// In en, this message translates to:
  /// **'Languages'**
  String get languages;

  /// No description provided for @none.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get none;

  /// No description provided for @bookDetails.
  ///
  /// In en, this message translates to:
  /// **'Book Details'**
  String get bookDetails;

  /// No description provided for @deleteList.
  ///
  /// In en, this message translates to:
  /// **'Delete List'**
  String get deleteList;

  /// No description provided for @deleteListConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete \"{title}\"? This cannot be undone.'**
  String deleteListConfirm(String title);

  /// No description provided for @editWord.
  ///
  /// In en, this message translates to:
  /// **'Edit Word'**
  String get editWord;

  /// No description provided for @addWord.
  ///
  /// In en, this message translates to:
  /// **'Add Word'**
  String get addWord;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @deleteWord.
  ///
  /// In en, this message translates to:
  /// **'Delete Word'**
  String get deleteWord;

  /// No description provided for @deleteWordConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove \"{word}\" from this list?'**
  String deleteWordConfirm(String word);

  /// No description provided for @exportAsText.
  ///
  /// In en, this message translates to:
  /// **'Export as text'**
  String get exportAsText;

  /// No description provided for @pickFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Pick from Gallery'**
  String get pickFromGallery;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take Photo'**
  String get takePhoto;

  /// No description provided for @addMore.
  ///
  /// In en, this message translates to:
  /// **'Add More'**
  String get addMore;

  /// No description provided for @autoDetect.
  ///
  /// In en, this message translates to:
  /// **'Auto-detect'**
  String get autoDetect;

  /// No description provided for @goToVocabularyLists.
  ///
  /// In en, this message translates to:
  /// **'Go to Vocabulary Lists'**
  String get goToVocabularyLists;

  /// No description provided for @nWords.
  ///
  /// In en, this message translates to:
  /// **'{count} words'**
  String nWords(int count);

  /// No description provided for @failedToPickImages.
  ///
  /// In en, this message translates to:
  /// **'Failed to pick images: {error}'**
  String failedToPickImages(String error);

  /// No description provided for @failedToTakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Failed to take photo: {error}'**
  String failedToTakePhoto(String error);

  /// No description provided for @cancelSubscription.
  ///
  /// In en, this message translates to:
  /// **'Cancel Subscription'**
  String get cancelSubscription;

  /// No description provided for @cancelSubscriptionConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.'**
  String get cancelSubscriptionConfirm;

  /// No description provided for @keepSubscription.
  ///
  /// In en, this message translates to:
  /// **'Keep Subscription'**
  String get keepSubscription;

  /// No description provided for @subscriptionCreated.
  ///
  /// In en, this message translates to:
  /// **'Subscription created successfully!'**
  String get subscriptionCreated;

  /// No description provided for @purchaseFailed.
  ///
  /// In en, this message translates to:
  /// **'Purchase failed: {error}'**
  String purchaseFailed(String error);

  /// No description provided for @restoringPurchases.
  ///
  /// In en, this message translates to:
  /// **'Restoring purchases...'**
  String get restoringPurchases;

  /// No description provided for @purchasesRestored.
  ///
  /// In en, this message translates to:
  /// **'Purchases restored successfully!'**
  String get purchasesRestored;

  /// No description provided for @failedToRestorePurchases.
  ///
  /// In en, this message translates to:
  /// **'Failed to restore purchases: {error}'**
  String failedToRestorePurchases(String error);

  /// No description provided for @restorePurchases.
  ///
  /// In en, this message translates to:
  /// **'Restore Purchases'**
  String get restorePurchases;

  /// No description provided for @subscribe.
  ///
  /// In en, this message translates to:
  /// **'Subscribe'**
  String get subscribe;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get tryAgain;

  /// No description provided for @backToTraining.
  ///
  /// In en, this message translates to:
  /// **'Back to Training'**
  String get backToTraining;

  /// No description provided for @overallAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Overall accuracy: {percent}%'**
  String overallAccuracy(int percent);

  /// No description provided for @wordFlaggedForReview.
  ///
  /// In en, this message translates to:
  /// **'Word flagged for review'**
  String get wordFlaggedForReview;

  /// No description provided for @statusAnalyzing.
  ///
  /// In en, this message translates to:
  /// **'Analyzing images…'**
  String get statusAnalyzing;

  /// No description provided for @statusFailed.
  ///
  /// In en, this message translates to:
  /// **'Analysis failed'**
  String get statusFailed;

  /// No description provided for @statusPartiallyCompleted.
  ///
  /// In en, this message translates to:
  /// **'Some images could not be analyzed'**
  String get statusPartiallyCompleted;

  /// No description provided for @allModes.
  ///
  /// In en, this message translates to:
  /// **'All modes'**
  String get allModes;

  /// No description provided for @allLists.
  ///
  /// In en, this message translates to:
  /// **'All lists'**
  String get allLists;

  /// No description provided for @forceRemoveTraining.
  ///
  /// In en, this message translates to:
  /// **'Force Remove Training'**
  String get forceRemoveTraining;

  /// No description provided for @forceRemoveConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove \"{name}\" from the list? This will also attempt to delete it from the server.'**
  String forceRemoveConfirm(String name);

  /// No description provided for @removedTraining.
  ///
  /// In en, this message translates to:
  /// **'Removed \"{name}\"'**
  String removedTraining(String name);

  /// No description provided for @admin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get admin;

  /// No description provided for @accessDenied.
  ///
  /// In en, this message translates to:
  /// **'Access denied'**
  String get accessDenied;

  /// No description provided for @load.
  ///
  /// In en, this message translates to:
  /// **'Load'**
  String get load;

  /// No description provided for @noDataAvailable.
  ///
  /// In en, this message translates to:
  /// **'No data available'**
  String get noDataAvailable;

  /// No description provided for @confirmMigration.
  ///
  /// In en, this message translates to:
  /// **'Confirm Migration'**
  String get confirmMigration;

  /// No description provided for @sourceAndTargetMustDiffer.
  ///
  /// In en, this message translates to:
  /// **'Source and target user must be different.'**
  String get sourceAndTargetMustDiffer;

  /// No description provided for @migrate.
  ///
  /// In en, this message translates to:
  /// **'Migrate'**
  String get migrate;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign In'**
  String get alreadyHaveAccount;

  /// No description provided for @haveVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'Have a verification code?'**
  String get haveVerificationCode;

  /// No description provided for @backToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to Sign In'**
  String get backToSignIn;

  /// No description provided for @gettingStarted.
  ///
  /// In en, this message translates to:
  /// **'Getting Started'**
  String get gettingStarted;

  /// No description provided for @gettingStartedSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Not sure where to begin? Here are a few ideas:'**
  String get gettingStartedSubtitle;

  /// No description provided for @gettingStartedTryPublicLists.
  ///
  /// In en, this message translates to:
  /// **'Try a test with existing lists'**
  String get gettingStartedTryPublicLists;

  /// No description provided for @gettingStartedTryPublicListsDesc.
  ///
  /// In en, this message translates to:
  /// **'Browse public vocabulary lists and start a training right away'**
  String get gettingStartedTryPublicListsDesc;

  /// No description provided for @gettingStartedScanVocabulary.
  ///
  /// In en, this message translates to:
  /// **'Scan your own vocabularies'**
  String get gettingStartedScanVocabulary;

  /// No description provided for @gettingStartedScanVocabularyDesc.
  ///
  /// In en, this message translates to:
  /// **'Take a photo of your textbook or notes to create a vocabulary list'**
  String get gettingStartedScanVocabularyDesc;

  /// No description provided for @gettingStartedChangeLanguage.
  ///
  /// In en, this message translates to:
  /// **'Change your language'**
  String get gettingStartedChangeLanguage;

  /// No description provided for @gettingStartedChangeLanguageDesc.
  ///
  /// In en, this message translates to:
  /// **'Switch the app language in settings to match your preference'**
  String get gettingStartedChangeLanguageDesc;

  /// No description provided for @gettingStartedExploreTraining.
  ///
  /// In en, this message translates to:
  /// **'Explore training modes'**
  String get gettingStartedExploreTraining;

  /// No description provided for @gettingStartedExploreTrainingDesc.
  ///
  /// In en, this message translates to:
  /// **'Choose between text input, multiple choice, or AI-powered training'**
  String get gettingStartedExploreTrainingDesc;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'de',
    'en',
    'es',
    'fr',
    'ja',
    'pt',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
    case 'ja':
      return AppLocalizationsJa();
    case 'pt':
      return AppLocalizationsPt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
