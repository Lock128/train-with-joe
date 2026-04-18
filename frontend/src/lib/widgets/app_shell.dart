import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';
import '../l10n/generated/app_localizations.dart';

/// Shared shell widget that wraps authenticated screens with navigation.
/// On narrow screens (mobile): bottom navigation bar.
/// On wide screens (web/tablet): side navigation rail + drawer.
class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  /// Builds the navigation destinations using translated labels.
  static List<_NavDestination> _buildDestinations(AppLocalizations l10n) => [
    _NavDestination('/home', Icons.home_outlined, Icons.home, l10n.home),
    _NavDestination('/vocabulary/analyze', Icons.camera_alt_outlined, Icons.camera_alt, l10n.scan),
    _NavDestination('/vocabulary', Icons.list_alt_outlined, Icons.list_alt, l10n.lists),
    _NavDestination('/trainings', Icons.quiz_outlined, Icons.quiz, l10n.training),
    _NavDestination('/statistics', Icons.bar_chart_outlined, Icons.bar_chart, l10n.statistics),
    _NavDestination('/subscription', Icons.card_membership_outlined, Icons.card_membership, l10n.subscription),
    _NavDestination('/info', Icons.info_outline, Icons.info, l10n.info),
    _NavDestination('/settings', Icons.settings_outlined, Icons.settings, l10n.settings),
  ];

  List<_NavDestination> _effectiveDestinations(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final destinations = _buildDestinations(l10n);
    final isAdmin = context.watch<UserProvider>().isAdmin;
    if (isAdmin) {
      return [...destinations, _NavDestination('/admin', Icons.admin_panel_settings_outlined, Icons.admin_panel_settings, 'Admin')];
    }
    return destinations;
  }

  int _currentIndex(BuildContext context) {
    final destinations = _effectiveDestinations(context);
    final location = GoRouterState.of(context).matchedLocation;
    int bestIndex = 0;
    int bestLength = 0;
    for (var i = 0; i < destinations.length; i++) {
      final path = destinations[i].path;
      if (location.startsWith(path) && path.length > bestLength) {
        bestIndex = i;
        bestLength = path.length;
      }
    }
    return bestIndex;
  }

  void _onDestinationSelected(BuildContext context, int index) async {
    final destinations = _effectiveDestinations(context);
    final targetPath = destinations[index].path;

    // If the user is in an active training execution, confirm before navigating away.
    final location = GoRouterState.of(context).matchedLocation;
    if (RegExp(r'^/trainings/[^/]+/execute/[^/]+$').hasMatch(location)) {
      final l10n = AppLocalizations.of(context)!;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.abortTraining),
          content: Text(l10n.abortTrainingMessage),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(l10n.continueText),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: Text(l10n.abort),
            ),
          ],
        ),
      );
      if (confirmed != true || !context.mounted) return;
    }

    context.go(targetPath);
  }

  Future<void> _handleSignOut(BuildContext context) async {
    final authProvider = context.read<AuthProvider>();
    await authProvider.signOut();
    if (context.mounted) {
      context.go('/signin');
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _currentIndex(context);
    final isWide = MediaQuery.of(context).size.width >= 600;

    if (isWide) {
      return _buildWideLayout(context, selectedIndex);
    }
    return _buildNarrowLayout(context, selectedIndex);
  }

  /// Wide layout: NavigationRail on the left side
  Widget _buildWideLayout(BuildContext context, int selectedIndex) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        right: false,
        child: Row(
        children: [
          NavigationRail(
            selectedIndex: selectedIndex,
            onDestinationSelected: (i) => _onDestinationSelected(context, i),
            labelType: NavigationRailLabelType.all,
            leading: Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  Icon(Icons.school, color: Theme.of(context).colorScheme.primary, size: 32),
                  const SizedBox(height: 4),
                  Text(
                    'Train\nwith Joe',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
            trailing: Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: IconButton(
                    icon: const Icon(Icons.logout),
                    tooltip: AppLocalizations.of(context)!.signOut,
                    onPressed: () => _handleSignOut(context),
                  ),
                ),
              ),
            ),
            destinations: _effectiveDestinations(context)
                .map((d) => NavigationRailDestination(
                      icon: Icon(d.icon),
                      selectedIcon: Icon(d.selectedIcon),
                      label: Text(d.label),
                    ))
                .toList(),
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(child: child),
        ],
        ),
      ),
    );
  }

  /// Narrow layout: bottom NavigationBar + drawer accessible from AppBar
  Widget _buildNarrowLayout(BuildContext context, int selectedIndex) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (i) => _onDestinationSelected(context, i),
        destinations: _effectiveDestinations(context)
            .map((d) => NavigationDestination(
                  icon: Icon(d.icon),
                  selectedIcon: Icon(d.selectedIcon),
                  label: d.label,
                ))
            .toList(),
      ),
    );
  }
}

class _NavDestination {
  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const _NavDestination(this.path, this.icon, this.selectedIcon, this.label);
}
