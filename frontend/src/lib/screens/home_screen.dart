import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';
import '../l10n/generated/app_localizations.dart';

/// Home screen for authenticated users
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Load user data when screen initializes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<UserProvider>().loadUser();
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.home),
        automaticallyImplyLeading: false,
      ),
      body: Consumer2<AuthProvider, UserProvider>(
        builder: (context, authProvider, userProvider, _) {
          if (userProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (userProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    l10n.errorLoadingUserData,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    userProvider.error!,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => userProvider.loadUser(),
                    icon: const Icon(Icons.refresh),
                    label: Text(l10n.retry),
                  ),
                ],
              ),
            );
          }

          final user = userProvider.user;
          final currentUser = authProvider.currentUser;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Welcome card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          children: [
                            const CircleAvatar(
                              radius: 50,
                              backgroundColor: Color(0xFFE8F4FD),
                              child: ClipOval(
                                child: Image(
                                  image: AssetImage('assets/images/app_icon.png'),
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              l10n.welcome,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 8),
                            if (user != null && user['name'] != null)
                              Text(
                                user['name'] as String,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            if (user != null && user['email'] != null)
                              Text(
                                user['email'] as String,
                                style: const TextStyle(color: Colors.grey),
                              )
                            else if (currentUser != null)
                              Text(
                                currentUser.username,
                                style: const TextStyle(color: Colors.grey),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Subscription status card
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.card_membership),
                        title: Text(l10n.subscription),
                        subtitle: Text(
                          user != null && user['subscriptionStatus'] != null
                              ? l10n.subscriptionStatus(user['subscriptionStatus'] as String)
                              : l10n.noActiveSubscription,
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                        onTap: () => context.go('/subscription'),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Quick actions
                    Text(
                      l10n.quickActions,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    ElevatedButton.icon(
                      onPressed: () => context.go('/vocabulary/analyze'),
                      icon: const Icon(Icons.camera_alt),
                      label: Text(l10n.scanImageForVocabulary),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                    const SizedBox(height: 12),

                    ElevatedButton.icon(
                      onPressed: () => context.go('/vocabulary'),
                      icon: const Icon(Icons.list_alt),
                      label: Text(l10n.myVocabularyLists),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        backgroundColor: const Color(0xFFF0932B),
                      ),
                    ),
                    const SizedBox(height: 12),

                    ElevatedButton.icon(
                      onPressed: () => context.go('/trainings'),
                      icon: const Icon(Icons.quiz),
                      label: Text(l10n.myTrainings),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        backgroundColor: const Color(0xFF27AE60),
                      ),
                    ),
                    const SizedBox(height: 12),

                    OutlinedButton.icon(
                      onPressed: () => context.go('/subscription'),
                      icon: const Icon(Icons.upgrade),
                      label: Text(l10n.manageSubscription),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
