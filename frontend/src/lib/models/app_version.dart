/// Populated via --dart-define at build time.
/// Codemagic: --dart-define=COMMIT_ID=... --dart-define=GITHUB_RUN_NUMBER=...
/// GitHub Actions: --dart-define=COMMIT_ID=... --dart-define=GITHUB_RUN_NUMBER=...
class AppVersion {
  static const String commitId = String.fromEnvironment('COMMIT_ID', defaultValue: 'local');
  static const String buildNumber = String.fromEnvironment('GITHUB_RUN_NUMBER', defaultValue: '0');
  static const String appName = 'Train with Joe';
}
