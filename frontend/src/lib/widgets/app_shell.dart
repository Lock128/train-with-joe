import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';

/// Shared shell widget that wraps authenticated screens with navigation.
/// On narrow screens (mobile): bottom navigation bar.
/// On wide screens (web/tablet): side navigation rail + drawer.
class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  static const _destinations = [
    _NavDestination('/home', Icons.home_outlined, Icons.home, 'Home'),
    _NavDestination('/vocabulary/analyze', Icons.camera_alt_outlined, Icons.camera_alt, 'Scan'),
    _NavDestination('/vocabulary', Icons.list_alt_outlined, Icons.list_alt, 'Lists'),
    _NavDestination('/trainings', Icons.quiz_outlined, Icons.quiz, 'Training'),
    _NavDestination('/subscription', Icons.card_membership_outlined, Icons.card_membership, 'Subscription'),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    for (var i = 0; i < _destinations.length; i++) {
      if (location == _destinations[i].path) return i;
    }
    return 0;
  }

  void _onDestinationSelected(BuildContext context, int index) {
    context.go(_destinations[index].path);
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
      body: Row(
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
                    tooltip: 'Sign Out',
                    onPressed: () => _handleSignOut(context),
                  ),
                ),
              ),
            ),
            destinations: _destinations
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
    );
  }

  /// Narrow layout: bottom NavigationBar + drawer accessible from AppBar
  Widget _buildNarrowLayout(BuildContext context, int selectedIndex) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (i) => _onDestinationSelected(context, i),
        destinations: _destinations
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
