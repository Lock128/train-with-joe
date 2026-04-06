import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_api/amplify_api.dart';
import 'package:go_router/go_router.dart';

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
import 'screens/vocabulary_lists_screen.dart';
import 'screens/vocabulary_list_detail_screen.dart';
import 'screens/info_screen.dart';
import 'screens/training_list_screen.dart';
import 'screens/training_creation_screen.dart';
import 'screens/training_detail_screen.dart';
import 'screens/training_execution_screen.dart';
import 'screens/training_results_screen.dart';
import 'screens/training_history_screen.dart';
import 'screens/training_statistics_screen.dart';
import 'screens/settings_screen.dart';
import 'widgets/app_shell.dart';
import 'services/feedback_sound_service.dart';
import 'providers/locale_provider.dart';
import 'l10n/generated/app_localizations.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Pre-generate feedback jingles so playback is instant
  FeedbackSoundService().init();
  
  // Set up global error handling
  FlutterError.onError = (FlutterErrorDetails details) {
    debugPrint('Flutter error: ${details.exception}');
    debugPrint('Stack trace: ${details.stack}');
    FlutterError.presentError(details);
  };

  // Handle errors in async operations
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Async error caught: $error');
    debugPrint('Stack trace: $stack');
    return true;
  };

  runApp(const MyApp());
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
      final api = AmplifyAPI();
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
    return MaterialApp.router(
            title: 'Train with Joe',
            locale: localeProvider.locale,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xFF2B6CB0),
                brightness: Brightness.light,
                primary: const Color(0xFF2B6CB0),
                secondary: const Color(0xFFF0932B),
                tertiary: const Color(0xFF5BC0DE),
              ),
              useMaterial3: true,
              fontFamily: 'Nunito',
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2B6CB0),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
              outlinedButtonTheme: OutlinedButtonThemeData(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF2B6CB0),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  side: const BorderSide(color: Color(0xFF2B6CB0)),
                ),
              ),
              textButtonTheme: TextButtonThemeData(
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF2B6CB0),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFF2B6CB0), width: 2),
                ),
              ),
              cardTheme: CardThemeData(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
              appBarTheme: const AppBarTheme(
                backgroundColor: Color(0xFF2B6CB0),
                foregroundColor: Colors.white,
                elevation: 0,
              ),
            ),
            routerConfig: _router,
    );
  }

  GoRouter _createRouter(app.AuthProvider authProvider) {
    return GoRouter(
      initialLocation: authProvider.isAuthenticated ? '/home' : '/signin',
      refreshListenable: authProvider,
      redirect: (context, state) {
        final isAuthenticated = authProvider.isAuthenticated;
        final isAuthRoute = state.matchedLocation == '/signin' || 
                           state.matchedLocation == '/register' ||
                           state.matchedLocation == '/verify-email';

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
          builder: (context, state) => const SignInScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/verify-email',
          builder: (context, state) {
            final email = state.uri.queryParameters['email'] ?? '';
            return VerifyEmailScreen(email: email);
          },
        ),
        ShellRoute(
          builder: (context, state, child) => AppShell(child: child),
          routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
            ),
            GoRoute(
              path: '/subscription',
              builder: (context, state) => const SubscriptionScreen(),
            ),
            GoRoute(
              path: '/vocabulary',
              builder: (context, state) => const VocabularyListsScreen(),
            ),
            GoRoute(
              path: '/vocabulary/analyze',
              builder: (context, state) => const ImageVocabularyScreen(),
            ),
            GoRoute(
              path: '/vocabulary/:id',
              builder: (context, state) => VocabularyListDetailScreen(
                listId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/info',
              builder: (context, state) => const InfoScreen(),
            ),
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsScreen(),
            ),
            GoRoute(
              path: '/trainings',
              builder: (context, state) => const TrainingListScreen(),
            ),
            GoRoute(
              path: '/trainings/create',
              builder: (context, state) => const TrainingCreationScreen(),
            ),
            GoRoute(
              path: '/trainings/:id',
              builder: (context, state) => TrainingDetailScreen(
                trainingId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/trainings/:id/execute/:executionId',
              builder: (context, state) => TrainingExecutionScreen(
                trainingId: state.pathParameters['id']!,
                executionId: state.pathParameters['executionId']!,
              ),
            ),
            GoRoute(
              path: '/trainings/:id/results/:executionId',
              builder: (context, state) => TrainingResultsScreen(
                trainingId: state.pathParameters['id']!,
                executionId: state.pathParameters['executionId']!,
              ),
            ),
            GoRoute(
              path: '/trainings/:id/history',
              builder: (context, state) => TrainingHistoryScreen(
                trainingId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/statistics',
              builder: (context, state) => const TrainingStatisticsScreen(),
            ),
          ],
        ),
      ],
    );
  }
}
