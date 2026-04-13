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

  @override
  String get createTraining => 'トレーニングを作成';

  @override
  String get startTraining => 'トレーニングを開始';

  @override
  String get trainingHistory => 'トレーニング履歴';

  @override
  String get results => '結果';

  @override
  String get analyzeImagesForVocabulary => '画像を分析して単語を取得';

  @override
  String get analyzeAnImage => '画像を分析';

  @override
  String get vocabularyList => '単語リスト';

  @override
  String get listNotFound => 'リストが見つかりません';

  @override
  String get trainingNotFound => 'トレーニングが見つかりません';

  @override
  String get executionNotFound => '実行が見つかりません';

  @override
  String get noVocabularyListsAvailable => '単語リストがありません';

  @override
  String get createVocabularyListsFirst => 'トレーニングを作成するには、まず単語リストを作成してください。';

  @override
  String get noVocabularyListsYet => 'まだ単語リストがありません';

  @override
  String get analyzeImageToCreate => '画像を分析して最初の単語リストを作成しましょう！';

  @override
  String get errorLoadingVocabularyLists => '単語リストの読み込みエラー';

  @override
  String get noTrainingsYet => 'まだトレーニングがありません';

  @override
  String get createFirstTraining => 'トレーニングを作成して練習を始めましょう！';

  @override
  String get errorLoadingTrainings => 'トレーニングの読み込みエラー';

  @override
  String get trainingName => 'トレーニング名（任意）';

  @override
  String get enterTrainingName => 'トレーニングの名前を入力';

  @override
  String get trainingMode => 'トレーニングモード';

  @override
  String get textInput => 'テキスト入力';

  @override
  String get multipleChoice => '選択式';

  @override
  String get aiTraining => 'AIトレーニング';

  @override
  String get trainingDirection => 'トレーニング方向';

  @override
  String get wordToTranslation => '単語 → 翻訳';

  @override
  String get translationToWord => '翻訳 → 単語';

  @override
  String get yourVocabularyLists => 'あなたの単語リスト';

  @override
  String get publicVocabularyLists => '公開単語リスト';

  @override
  String get searchLists => 'リストを検索';

  @override
  String get searchListsHint => 'タイトル、出版社、学校、学年、ISBN、言語…';

  @override
  String get noListsYet => 'まだ単語リストがありません。';

  @override
  String get noListsMatchSearch => '検索に一致するリストがありません。';

  @override
  String get noTrainingsMatchFilters => 'フィルターに一致するトレーニングがありません';

  @override
  String get clearFilters => 'フィルターをクリア';

  @override
  String numberOfWords(int count) {
    return '単語数: $count';
  }

  @override
  String wordsAvailable(int count) {
    return '選択したリストに$count語あります';
  }

  @override
  String maxWordsPicked(int count) {
    return '選択したリストに$count語あります（最大100語がランダムに選ばれます）';
  }

  @override
  String get randomizedMode => 'ランダムモード';

  @override
  String get randomizedModeDescription => 'このトレーニングを開始するたびに異なる単語を選択';

  @override
  String get wordRemoved => '単語を削除しました';

  @override
  String get failedToRemoveWord => '単語の削除に失敗しました';

  @override
  String get renameTraining => 'トレーニング名を変更';

  @override
  String get cancel => 'キャンセル';

  @override
  String get rename => '名前を変更';

  @override
  String get deleteTraining => 'トレーニングを削除';

  @override
  String get deleteTrainingConfirm => 'このトレーニングを本当に削除しますか？元に戻せません。';

  @override
  String get delete => '削除';

  @override
  String get failedToDeleteTraining => 'トレーニングの削除に失敗しました';

  @override
  String get addWords => '単語を追加';

  @override
  String addCount(int count) {
    return '$count個追加';
  }

  @override
  String get renameList => 'リスト名を変更';

  @override
  String get save => '保存';

  @override
  String get languages => '言語';

  @override
  String get none => 'なし';

  @override
  String get bookDetails => '書籍の詳細';

  @override
  String get deleteList => 'リストを削除';

  @override
  String deleteListConfirm(String title) {
    return '「$title」を削除しますか？元に戻せません。';
  }

  @override
  String get editWord => '単語を編集';

  @override
  String get addWord => '単語を追加';

  @override
  String get add => '追加';

  @override
  String get deleteWord => '単語を削除';

  @override
  String deleteWordConfirm(String word) {
    return '「$word」をこのリストから削除しますか？';
  }

  @override
  String get exportAsText => 'テキストとしてエクスポート';

  @override
  String get pickFromGallery => 'ギャラリーから選択';

  @override
  String get takePhoto => '写真を撮る';

  @override
  String get addMore => 'さらに追加';

  @override
  String get autoDetect => '自動検出';

  @override
  String get goToVocabularyLists => '単語リストへ';

  @override
  String nWords(int count) {
    return '$count語';
  }

  @override
  String failedToPickImages(String error) {
    return '画像の選択に失敗しました: $error';
  }

  @override
  String failedToTakePhoto(String error) {
    return '写真の撮影に失敗しました: $error';
  }

  @override
  String get cancelSubscription => 'サブスクリプションをキャンセル';

  @override
  String get cancelSubscriptionConfirm =>
      'サブスクリプションをキャンセルしますか？請求期間の終了まで引き続きアクセスできます。';

  @override
  String get keepSubscription => 'サブスクリプションを維持';

  @override
  String get subscriptionCreated => 'サブスクリプションが正常に作成されました！';

  @override
  String purchaseFailed(String error) {
    return '購入に失敗しました: $error';
  }

  @override
  String get restoringPurchases => '購入を復元中...';

  @override
  String get purchasesRestored => '購入が正常に復元されました！';

  @override
  String failedToRestorePurchases(String error) {
    return '購入の復元に失敗しました: $error';
  }

  @override
  String get restorePurchases => '購入を復元';

  @override
  String get subscribe => '登録する';

  @override
  String get tryAgain => 'もう一度試す';

  @override
  String get backToTraining => 'トレーニングに戻る';

  @override
  String overallAccuracy(int percent) {
    return '全体の正答率: $percent%';
  }

  @override
  String get wordFlaggedForReview => '単語を復習用にマークしました';

  @override
  String get allModes => 'すべてのモード';

  @override
  String get allLists => 'すべてのリスト';

  @override
  String get forceRemoveTraining => 'トレーニングを強制削除';

  @override
  String forceRemoveConfirm(String name) {
    return '「$name」をリストから削除しますか？サーバーからの削除も試みます。';
  }

  @override
  String removedTraining(String name) {
    return '「$name」を削除しました';
  }

  @override
  String get admin => '管理者';

  @override
  String get accessDenied => 'アクセスが拒否されました';

  @override
  String get load => '読み込み';

  @override
  String get noDataAvailable => 'データがありません';

  @override
  String get confirmMigration => '移行を確認';

  @override
  String get sourceAndTargetMustDiffer => '移行元と移行先のユーザーは異なる必要があります。';

  @override
  String get migrate => '移行';

  @override
  String get alreadyHaveAccount => 'アカウントをお持ちですか？サインイン';

  @override
  String get haveVerificationCode => '確認コードをお持ちですか？';

  @override
  String get backToSignIn => 'サインインに戻る';
}
