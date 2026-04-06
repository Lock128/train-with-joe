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
}
