import 'package:material_ui/material_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_api/amplify_api.dart';
import 'package:go_router/go_router.dart';
import 'package:dash0_flutter_sdk/dash0_flutter_sdk.dart';

import 'models/app_version.dart';
import 'utils/dash0_amplify_http_client.dart';
import 'utils/dash0_config.dart';
import 'utils/dash0_device.dart';
import 'utils/dash0_diagnostics.dart';

import 'models/amplifyconfiguration.dart';
import 'providers/auth_provider.dart' as app;
import 'providers/user_provider.dart';
import 'providers/subscription_provider.dart';
import 'providers/vocabulary_provider.dart';
import 'providers/training_provider.dart';
import 'screens/signin_screen.dart';
import 'screens/register_screen.dart';
import 'screens/verify_email_screen.dart';
import 'screens/home_screen.dart';
import 'screens/subscription_screen.dart';
import 'screens/image_vocabulary_screen.dart';
import 'screens/scan_translate_screen.dart';
import 'screens/vocabulary_lists_screen.dart';
import 'screens/vocabulary_list_detail_screen.dart';
import 'screens/info_screen.dart';
import 'screens/dash0_diagnostics_screen.dart';
import 'screens/training_list_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/new_password_screen.dart';
import 'screens/training_creation_screen.dart';
import 'screens/training_detail_screen.dart';
import 'screens/training_execution_screen.dart';
import 'screens/training_results_screen.dart';
import 'screens/training_history_screen.dart';
import 'screens/training_statistics_screen.dart';
import 'screens/impressum_screen.dart';
import 'screens/admin_screen.dart';
import 'screens/settings_screen.dart';
import 'widgets/app_shell.dart';
import 'services/feedback_sound_service.dart';
import 'providers/locale_provider.dart';
import 'providers/theme_provider.dart';
import 'l10n/generated/app_localizations.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Pre-generate feedback jingles so playback is instant
  FeedbackSoundService().init();

  // Initialize Dash0 telemetry first so later errors are captured. This never
  // throws and does nothing when no OTLP endpoint and token were built in.
  await _initializeOpenTelemetry();

  // Set up global error handling
  FlutterError.onError = (FlutterErrorDetails details) {
    Dash0.reportError(details.exception, stackTrace: details.stack);
    debugPrint('Flutter error: ${details.exception}');
    debugPrint('Stack trace: ${details.stack}');
    FlutterError.presentError(details);
  };

  // Handle errors in async operations
  PlatformDispatcher.instance.onError = (error, stack) {
    Dash0.reportError(error, stackTrace: stack);
    debugPrint('Async error caught: $error');
    debugPrint('Stack trace: $stack');
    return true;
  };

  // PlatformDispatcher.onError covers async errors, so no extra zone is used.
  runApp(const MyApp());
}

/// Initializes the Dash0 Flutter SDK from build-time `--dart-define` values
/// (see SETUP_OTEL.md). Telemetry must never block or break app start: any
/// failure is logged and ignored, and nothing is started without an OTLP
/// endpoint and bearer token. There is no backend feature flag in this app, so
/// the SDK records as soon as it is configured. Session replay and profiling
/// are off unless enabled at build time.
Future<void> _initializeOpenTelemetry() async {
  try {
    const otlpEndpoint = String.fromEnvironment('OTEL_EXPORTER_OTLP_ENDPOINT', defaultValue: '');
    const otlpHeaders = String.fromEnvironment('OTEL_EXPORTER_OTLP_HEADERS', defaultValue: '');

    final headers = parseOtlpHeaders(otlpHeaders);
    final authToken = extractBearerToken(headers);

    // Release builds hide SDK logs. DASH0_SDK_DEBUG=true turns them on.
    const sdkDebugFlag = String.fromEnvironment('DASH0_SDK_DEBUG', defaultValue: '');
    final sdkDebug = parseBoolFlag(sdkDebugFlag, defaultValue: false);

    final diagnostics = Dash0Diagnostics.instance;
    diagnostics.recordConfig(
      endpoint: otlpEndpoint,
      authToken: authToken,
      dataset: extractDash0Dataset(headers),
      environment: currentDash0Environment(),
      serviceName: resolveDash0ServiceName('train-with-joe-flutter', currentDash0Environment()),
      serviceVersion: null,
      sdkDebug: sdkDebug,
    );

    if (otlpEndpoint.isEmpty || authToken == null) {
      diagnostics.recordNotConfigured();
      debugPrint('Dash0: no OTLP endpoint or auth token, telemetry disabled');
      return;
    }

    const replayRate = String.fromEnvironment('DASH0_SESSION_REPLAY_SAMPLING_RATE', defaultValue: '');
    const profilingFlag = String.fromEnvironment('DASH0_PROFILING_ENABLED', defaultValue: '');
    const httpOverridesFlag = String.fromEnvironment('DASH0_HTTP_OVERRIDES_ENABLED', defaultValue: '');
    const propagateFlag = String.fromEnvironment('DASH0_PROPAGATE_TRACE_HEADERS', defaultValue: '');
    const metricIntervalRaw = String.fromEnvironment('DASH0_METRIC_EXPORT_INTERVAL_SECONDS', defaultValue: '');

    final replaySamplingRate = parseSamplingRate(replayRate);
    final profilingEnabled = parseBoolFlag(profilingFlag, defaultValue: false);
    // HttpOverrides only affect dart:io, so they do nothing on web.
    final httpOverridesEnabled = !kIsWeb && parseBoolFlag(httpOverridesFlag, defaultValue: true);
    // Cross-origin trace headers need CORS allow-listing on the backend, so
    // they are off by default on web.
    final propagateTraceHeaders = parseBoolFlag(propagateFlag, defaultValue: !kIsWeb);

    final serviceName = resolveDash0ServiceName('train-with-joe-flutter', currentDash0Environment());

    String? serviceVersion;
    try {
      final info = await PackageInfo.fromPlatform();
      serviceVersion = resolveDash0ServiceVersion(info.version, info.buildNumber);
    } catch (_) {
      // The version is optional.
    }

    diagnostics.serviceVersion = serviceVersion;
    final instrumentations = buildDash0Instrumentations(
      httpOverrides: httpOverridesEnabled,
      sessionReplay: replaySamplingRate > 0,
      profiling: profilingEnabled,
    );

    await Dash0.init(
      Dash0Options(
        serviceName: serviceName,
        serviceVersion: serviceVersion,
        // Native apps have no browser user agent, so the SDK builds a
        // synthetic one without identifiers.
        syntheticUserAgent: !kIsWeb,
        endpoint: Dash0Endpoint(
          url: normalizeOtlpEndpoint(otlpEndpoint),
          authToken: authToken,
          dataset: extractDash0Dataset(headers),
        ),
        debug: kDebugMode || sdkDebug,
        // Reported as the resource attribute deployment.environment.name.
        environment: currentDash0Environment(),
        // Build info plus device model and OS version of native apps. The SDK
        // adds app.client.type (web-desktop, web-mobile, ios, android, ...).
        resourceAttributes: {
          'app.version': AppVersion.commitId,
          'app.build_number': AppVersion.buildNumber,
          ...await loadDash0DeviceAttributes(),
        },
        enabled: true,
        enabledInstrumentations: instrumentations,
        propagators: propagateTraceHeaders ? [Dash0Propagator.traceparent(dash0PropagationTargets)] : const [],
        compression: Dash0Compression.gzip,
        urlScrubber: scrubDash0Url,
        metricExportInterval: parseSeconds(metricIntervalRaw) ?? const Duration(seconds: 30),
        sessionReplaySamplingRate: replaySamplingRate,
      ),
    );
    diagnostics.recordInitialized(instrumentations: instrumentations, propagation: propagateTraceHeaders);
    debugPrint('Dash0 initialized');
  } catch (e, stackTrace) {
    Dash0Diagnostics.instance.recordFailure(e);
    // If the SDK fails to initialize, log but don't crash the app
    debugPrint('Failed to initialize Dash0: $e');
    debugPrint('Stack trace: $stackTrace');
  }
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _amplifyConfigured = false;
  String? _configError;

  @override
  void initState() {
    super.initState();
    _configureAmplify();
  }

  Future<void> _configureAmplify() async {
    try {
      // Check if Amplify is already configured
      if (Amplify.isConfigured) {
        debugPrint('Amplify already configured');
        setState(() {
          _amplifyConfigured = true;
        });
        return;
      }

      // Check if configuration has placeholder values
      if (amplifyconfig.contains('REPLACE_WITH_')) {
        debugPrint('Warning: Amplify configuration contains placeholder values');
        debugPrint('Running in development mode without AWS backend');
        setState(() {
          _amplifyConfigured = true;
          _configError = 'Development Mode: AWS backend not configured';
        });
        return;
      }

      // Add plugins before configuring
      debugPrint('Adding Amplify plugins...');
      final auth = AmplifyAuthCognito();
      // Amplify has its own HTTP stack, so route it through Dash0 to get
      // client spans for GraphQL requests.
      final api = AmplifyAPI(options: dash0AmplifyApiOptions());
      await Amplify.addPlugins([auth, api]);
      debugPrint('Amplify plugins added successfully');

      // Configure Amplify
      debugPrint('Configuring Amplify...');
      if (kDebugMode) {
        debugPrint('Amplify config being used:');
        debugPrint(amplifyconfig);
      }
      await Amplify.configure(amplifyconfig);
      debugPrint('Amplify configured successfully');

      // Verify authentication session
      try {
        final session = await Amplify.Auth.fetchAuthSession();
        debugPrint('Post-config session check: ${session.runtimeType}');
        debugPrint('Post-config is signed in: ${session.isSignedIn}');
      } catch (e) {
        debugPrint('Post-config session error: $e');
      }

      setState(() {
        _amplifyConfigured = true;
      });
    } catch (e) {
      debugPrint('Error configuring Amplify: $e');
      debugPrint('Error details: ${e.toString()}');
      
      // Allow app to run in development mode even with config errors
      if (kDebugMode && e.toString().contains('Non-HTTPS')) {
        debugPrint('Running in development mode despite HTTPS error');
        setState(() {
          _amplifyConfigured = true;
          _configError = 'Development Mode: ${e.toString()}';
        });
      } else {
        setState(() {
          _amplifyConfigured = false;
          _configError = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_amplifyConfigured) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: _configError != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      const Text(
                        'Configuration Error',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Text(
                          _configError!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _configError = null;
                          });
                          _configureAmplify();
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  )
                : const CircularProgressIndicator(),
          ),
        ),
      );
    }

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => app.AuthProvider()),
        ChangeNotifierProxyProvider<app.AuthProvider, UserProvider>(
          create: (_) => UserProvider(),
          update: (_, auth, previous) => previous!..updateAuth(auth),
        ),
        ChangeNotifierProxyProvider<app.AuthProvider, SubscriptionProvider>(
          create: (_) => SubscriptionProvider(),
          update: (_, auth, previous) => previous!..updateAuth(auth),
        ),
        ChangeNotifierProxyProvider<app.AuthProvider, VocabularyProvider>(
          create: (_) => VocabularyProvider(),
          update: (_, auth, previous) => previous!..updateAuth(auth),
        ),
        ChangeNotifierProxyProvider<app.AuthProvider, TrainingProvider>(
          create: (_) => TrainingProvider(),
          update: (_, auth, previous) => previous!..updateAuth(auth),
        ),
      ],
      child: _AuthenticatedApp(),
    );
  }
}

class _AuthenticatedApp extends StatefulWidget {
  @override
  State<_AuthenticatedApp> createState() => _AuthenticatedAppState();
}

class _AuthenticatedAppState extends State<_AuthenticatedApp> {
  GoRouter? _router;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_router == null) {
      final authProvider = context.read<app.AuthProvider>();
      _router = _createRouter(authProvider);
    }
  }

  @override
  void dispose() {
    _router?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final localeProvider = context.watch<LocaleProvider>();
    final themeProvider = context.watch<ThemeProvider>();

    return MaterialApp.router(
            title: 'Train with Joe',
            locale: localeProvider.locale,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            themeMode: themeProvider.themeMode,
            theme: _buildAppTheme(_lightColorScheme),
            darkTheme: _buildAppTheme(_darkColorScheme),
            routerConfig: _router,
    );
  }

  /// Light color scheme (original app palette).
  static final ColorScheme _lightColorScheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF2B6CB0),
    brightness: Brightness.light,
    primary: const Color(0xFF2B6CB0),
    secondary: const Color(0xFFF0932B),
    tertiary: const Color(0xFF5BC0DE),
    surface: const Color(0xFFF8FAFB),
    surfaceContainerLowest: Colors.white,
    surfaceContainerLow: const Color(0xFFF2F6F8),
    surfaceContainer: const Color(0xFFEDF2F5),
    surfaceContainerHigh: const Color(0xFFE4ECF0),
  );

  /// Dark color scheme derived from the same brand seed. Keeps the brand blue
  /// as primary while using darker surfaces tuned for readability.
  static final ColorScheme _darkColorScheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF2B6CB0),
    brightness: Brightness.dark,
    primary: const Color(0xFF5B9BD5),
    secondary: const Color(0xFFF0932B),
    tertiary: const Color(0xFF5BC0DE),
    surface: const Color(0xFF14181C),
    surfaceContainerLowest: const Color(0xFF1B2026),
    surfaceContainerLow: const Color(0xFF20262D),
    surfaceContainer: const Color(0xFF262D35),
    surfaceContainerHigh: const Color(0xFF2E363F),
  );

  /// Builds the app [ThemeData] for a given [colorScheme] so the light and dark
  /// themes share the exact same component styling.
  ThemeData _buildAppTheme(ColorScheme colorScheme) {
    return ThemeData(
              colorScheme: colorScheme,
              useMaterial3: true,
              fontFamily: 'Nunito',
              scaffoldBackgroundColor: colorScheme.surface,
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontFamily: 'Nunito',
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
              filledButtonTheme: FilledButtonThemeData(
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  textStyle: const TextStyle(
                    fontFamily: 'Nunito',
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
              outlinedButtonTheme: OutlinedButtonThemeData(
                style: OutlinedButton.styleFrom(
                  foregroundColor: colorScheme.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: BorderSide(color: colorScheme.outline.withValues(alpha: 0.3)),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  textStyle: const TextStyle(
                    fontFamily: 'Nunito',
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ),
              textButtonTheme: TextButtonThemeData(
                style: TextButton.styleFrom(
                  foregroundColor: colorScheme.primary,
                  textStyle: const TextStyle(
                    fontFamily: 'Nunito',
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: colorScheme.surfaceContainerLowest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colorScheme.outline.withValues(alpha: 0.2)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colorScheme.outline.withValues(alpha: 0.2)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colorScheme.primary, width: 2),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              cardTheme: CardThemeData(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
                color: colorScheme.surfaceContainerLowest,
                surfaceTintColor: Colors.transparent,
              ),
              appBarTheme: AppBarTheme(
                backgroundColor: colorScheme.surface,
                foregroundColor: colorScheme.onSurface,
                elevation: 0,
                scrolledUnderElevation: 0.5,
                centerTitle: false,
                titleTextStyle: TextStyle(
                  fontFamily: 'Nunito',
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: colorScheme.onSurface,
                ),
              ),
              tabBarTheme: TabBarThemeData(
                labelColor: colorScheme.primary,
                unselectedLabelColor: colorScheme.onSurfaceVariant,
                indicatorColor: colorScheme.primary,
                labelStyle: const TextStyle(
                  fontFamily: 'Nunito',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontFamily: 'Nunito',
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              navigationBarTheme: NavigationBarThemeData(
                elevation: 0,
                backgroundColor: colorScheme.surfaceContainerLowest,
                indicatorColor: colorScheme.primaryContainer,
                labelTextStyle: WidgetStatePropertyAll(
                  TextStyle(
                    fontFamily: 'Nunito',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              navigationRailTheme: NavigationRailThemeData(
                backgroundColor: colorScheme.surfaceContainerLowest,
                indicatorColor: colorScheme.primaryContainer,
                selectedLabelTextStyle: TextStyle(
                  fontFamily: 'Nunito',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.primary,
                ),
                unselectedLabelTextStyle: TextStyle(
                  fontFamily: 'Nunito',
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              chipTheme: ChipThemeData(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                side: BorderSide.none,
              ),
              dividerTheme: DividerThemeData(
                color: colorScheme.outlineVariant.withValues(alpha: 0.3),
                thickness: 1,
              ),
              floatingActionButtonTheme: FloatingActionButtonThemeData(
                backgroundColor: colorScheme.primary,
                foregroundColor: Colors.white,
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              snackBarTheme: SnackBarThemeData(
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              dialogTheme: DialogThemeData(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              bottomSheetTheme: const BottomSheetThemeData(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
              ),
              progressIndicatorTheme: ProgressIndicatorThemeData(
                linearTrackColor: colorScheme.primaryContainer.withValues(alpha: 0.3),
              ),
            );
  }

  GoRouter _createRouter(app.AuthProvider authProvider) {
    return GoRouter(
      initialLocation: authProvider.isAuthenticated ? '/home' : '/signin',
      refreshListenable: authProvider,
      observers: [Dash0.navigatorObserver],
      redirect: (context, state) {
        final isAuthenticated = authProvider.isAuthenticated;
        final isAuthRoute = state.matchedLocation == '/signin' || 
                           state.matchedLocation == '/register' ||
                           state.matchedLocation == '/verify-email' ||
                           state.matchedLocation == '/reset-password' ||
                           state.matchedLocation == '/new-password' ||
                           state.matchedLocation == '/auth/callback';

        // Redirect to home if authenticated and trying to access auth routes
        if (isAuthenticated && isAuthRoute) {
          return '/home';
        }

        // Redirect to signin if not authenticated and trying to access protected routes
        if (!isAuthenticated && !isAuthRoute) {
          return '/signin';
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/signin',
          name: 'signin',
          builder: (context, state) {
            final email = state.uri.queryParameters['email'];
            final registered = state.uri.queryParameters['registered'] == 'true';
            return SignInScreen(initialEmail: email, showRegisteredBanner: registered);
          },
        ),
        GoRoute(
          path: '/auth/callback',
          name: 'auth-callback',
          redirect: (context, state) {
            final email = state.uri.queryParameters['email'] ?? '';
            return '/signin?email=${Uri.encodeComponent(email)}&registered=true';
          },
        ),
        GoRoute(
          path: '/register',
          name: 'register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/verify-email',
          name: 'verify-email',
          builder: (context, state) {
            final email = state.uri.queryParameters['email'] ?? '';
            return VerifyEmailScreen(email: email);
          },
        ),
        GoRoute(
          path: '/reset-password',
          name: 'reset-password',
          builder: (context, state) {
            final email = state.uri.queryParameters['email'] ?? '';
            return ResetPasswordScreen(initialEmail: email);
          },
        ),
        GoRoute(
          path: '/new-password',
          name: 'new-password',
          builder: (context, state) => const NewPasswordScreen(),
        ),
        ShellRoute(
          observers: [Dash0.createNavigatorObserver()],
          builder: (context, state, child) => AppShell(child: child),
          routes: [
            GoRoute(
              path: '/home',
              name: 'home',
              builder: (context, state) => const HomeScreen(),
            ),
            GoRoute(
              path: '/subscription',
              name: 'subscription',
              builder: (context, state) => const SubscriptionScreen(),
            ),
            GoRoute(
              path: '/vocabulary',
              name: 'vocabulary',
              builder: (context, state) => const VocabularyListsScreen(),
            ),
            GoRoute(
              path: '/vocabulary/analyze',
              name: 'vocabulary-analyze',
              builder: (context, state) => const ImageVocabularyScreen(),
            ),
            GoRoute(
              path: '/vocabulary/scan-translate',
              name: 'vocabulary-scan-translate',
              builder: (context, state) => const ScanTranslateScreen(),
            ),
            GoRoute(
              path: '/vocabulary/:id',
              name: 'vocabulary-detail',
              builder: (context, state) => VocabularyListDetailScreen(
                listId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/info',
              name: 'info',
              builder: (context, state) => const InfoScreen(),
            ),
            // Developer screen, only reachable through the parental gate on
            // the info screen (long-press on the build number).
            GoRoute(
              path: '/info/dash0-diagnostics',
              name: 'dash0-diagnostics',
              builder: (context, state) => const Dash0DiagnosticsScreen(),
            ),
            GoRoute(
              path: '/settings',
              name: 'settings',
              builder: (context, state) => const SettingsScreen(),
            ),
            GoRoute(
              path: '/impressum',
              name: 'impressum',
              builder: (context, state) => const ImpressumScreen(),
            ),
            GoRoute(
              path: '/trainings',
              name: 'trainings',
              builder: (context, state) => const TrainingListScreen(),
            ),
            GoRoute(
              path: '/trainings/create',
              name: 'training-create',
              builder: (context, state) => const TrainingCreationScreen(),
            ),
            GoRoute(
              path: '/trainings/:id',
              name: 'training-detail',
              builder: (context, state) => TrainingDetailScreen(
                trainingId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/trainings/:id/execute/:executionId',
              name: 'training-execute',
              builder: (context, state) => TrainingExecutionScreen(
                trainingId: state.pathParameters['id']!,
                executionId: state.pathParameters['executionId']!,
              ),
            ),
            GoRoute(
              path: '/trainings/:id/results/:executionId',
              name: 'training-results',
              builder: (context, state) => TrainingResultsScreen(
                trainingId: state.pathParameters['id']!,
                executionId: state.pathParameters['executionId']!,
              ),
            ),
            GoRoute(
              path: '/trainings/:id/history',
              name: 'training-history',
              builder: (context, state) => TrainingHistoryScreen(
                trainingId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/statistics',
              name: 'statistics',
              builder: (context, state) => const TrainingStatisticsScreen(),
            ),
            GoRoute(
              path: '/admin',
              name: 'admin',
              builder: (context, state) => const AdminScreen(),
            ),
          ],
        ),
      ],
    );
  }
}
