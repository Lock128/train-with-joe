import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../domain/models/user.dart';
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

  /// Returns a localized tier display string based on user data.
  String _getTierDisplay(AppLocalizations l10n, AppUser? user) {
    if (user == null) {
      return l10n.tierLabel(l10n.tierFree);
    }
    switch (user.tier) {
      case UserTier.basic:
        return l10n.tierLabel(l10n.tierBasic);
      case UserTier.pro:
        return l10n.tierLabel(l10n.tierPro);
      case UserTier.free:
        return l10n.tierLabel(l10n.tierFree);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

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
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.error_outline,
                        size: 48,
                        color: Colors.red.shade400,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      l10n.errorLoadingUserData,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      userProvider.error!,
                      style: TextStyle(color: colorScheme.onSurfaceVariant),
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
                            CircleAvatar(
                              radius: 50,
                              backgroundColor: colorScheme.primaryContainer.withValues(alpha: 0.4),
                              child: const ClipOval(
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
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            if (user != null && user.name != null)
                              Text(
                                user.name!,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            if (user != null && user.email != null)
                              Text(
                                user.email!,
                                style: TextStyle(color: colorScheme.onSurfaceVariant),
                              )
                            else if (currentUser != null)
                              Text(
                                currentUser.username,
                                style: TextStyle(color: colorScheme.onSurfaceVariant),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Subscription status card
                    Card(
                      child: ListTile(
                        leading: Icon(Icons.card_membership, color: colorScheme.primary),
                        title: Text(l10n.subscription),
                        subtitle: Text(
                          _getTierDisplay(l10n, user),
                        ),
                        trailing: Icon(Icons.arrow_forward_ios, size: 16, color: colorScheme.onSurfaceVariant),
                        onTap: () => context.go('/subscription'),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Getting started section
                    Text(
                      l10n.gettingStarted,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.gettingStartedSubtitle,
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 12),

                    _GettingStartedCard(
                      icon: Icons.play_circle_outline,
                      color: const Color(0xFF2B6CB0),
                      title: l10n.gettingStartedTryPublicLists,
                      description: l10n.gettingStartedTryPublicListsDesc,
                      onTap: () => context.go('/trainings/create'),
                    ),
                    const SizedBox(height: 10),

                    _GettingStartedCard(
                      icon: Icons.camera_alt,
                      color: const Color(0xFFF0932B),
                      title: l10n.gettingStartedScanVocabulary,
                      description: l10n.gettingStartedScanVocabularyDesc,
                      onTap: () => context.go('/vocabulary/analyze'),
                    ),
                    const SizedBox(height: 10),

                    _GettingStartedCard(
                      icon: Icons.quiz,
                      color: const Color(0xFF27AE60),
                      title: l10n.gettingStartedExploreTraining,
                      description: l10n.gettingStartedExploreTrainingDesc,
                      onTap: () => context.go('/trainings'),
                    ),
                    const SizedBox(height: 10),

                    _GettingStartedCard(
                      icon: Icons.language,
                      color: const Color(0xFF5BC0DE),
                      title: l10n.gettingStartedChangeLanguage,
                      description: l10n.gettingStartedChangeLanguageDesc,
                      onTap: () => context.go('/settings'),
                    ),
                    const SizedBox(height: 24),

                    // Quick actions
                    Text(
                      l10n.quickActions,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
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

class _GettingStartedCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final VoidCallback onTap;

  const _GettingStartedCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 14, color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
            ],
          ),
        ),
      ),
    );
  }
}
