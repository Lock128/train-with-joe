// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'Joeとトレーニング';

  @override
  String get home => 'ホーム';

  @override
  String get scan => 'スキャン';

  @override
  String get lists => 'リスト';

  @override
  String get training => 'トレーニング';

  @override
  String get statistics => '統計';

  @override
  String get subscription => 'サブスクリプション';

  @override
  String get info => '情報';

  @override
  String get settings => '設定';

  @override
  String get signOut => 'サインアウト';

  @override
  String get welcome => 'ようこそ！';

  @override
  String get quickActions => 'クイックアクション';

  @override
  String get scanImageForVocabulary => '画像をスキャンして単語を取得';

  @override
  String get myVocabularyLists => '単語リスト';

  @override
  String get myTrainings => 'トレーニング一覧';

  @override
  String get manageSubscription => 'サブスクリプション管理';

  @override
  String get noActiveSubscription => '有効なサブスクリプションなし';

  @override
  String subscriptionStatus(String status) {
    return 'ステータス: $status';
  }

  @override
  String get errorLoadingUserData => 'ユーザーデータの読み込みエラー';

  @override
  String get retry => '再試行';

  @override
  String get language => '言語';

  @override
  String get trainingSounds => 'トレーニング音';

  @override
  String get enableTrainingSounds => 'トレーニング音を有効にする';

  @override
  String get appInfo => 'アプリ情報';

  @override
  String get frontend => 'フロントエンド';

  @override
  String get backend => 'バックエンド';

  @override
  String get commitId => 'コミットID';

  @override
  String get buildNumber => 'ビルド番号';

  @override
  String get failedToLoadBackendInfo => 'バックエンド情報の読み込みに失敗';

  @override
  String get configurationError => '設定エラー';

  @override
  String get abortTraining => 'トレーニングを中止しますか？';

  @override
  String get abortTrainingMessage => 'このセッションの進捗は失われます。';

  @override
  String get continueText => '続ける';

  @override
  String get abort => '中止';

  @override
  String wordProgress(int current, int total) {
    return '単語 $current / $total';
  }

  @override
  String get yourAnswer => 'あなたの回答';

  @override
  String get typeTheTranslation => '翻訳を入力';

  @override
  String get submit => '送信';

  @override
  String get muteSounds => 'ミュート';

  @override
  String get unmuteSounds => 'ミュート解除';

  @override
  String get english => '英語';

  @override
  String get german => 'ドイツ語';

  @override
  String get spanish => 'スペイン語';

  @override
  String get japanese => '日本語';

  @override
  String get french => 'フランス語';

  @override
  String get portuguese => 'ポルトガル語';
}
