import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';
import '../l10n/generated/app_localizations.dart';

/// Shared shell widget that wraps authenticated screens with navigation.
/// On narrow screens (mobile): bottom navigation bar with 4 primary + "More".
/// On wide screens (web/tablet): side navigation rail with all destinations.
class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  /// All navigation destinations.
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

  /// Number of items shown directly in the mobile bottom bar (excluding "More").
  static const int _primaryCount = 4;

  List<_NavDestination> _allDestinations(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final destinations = _buildDestinations(l10n);
    final isAdmin = context.watch<UserProvider>().isAdmin;
    if (isAdmin) {
      return [...destinations, _NavDestination('/admin', Icons.admin_panel_settings_outlined, Icons.admin_panel_settings, l10n.admin)];
    }
    return destinations;
  }

  /// Primary destinations shown in the mobile bottom bar.
  List<_NavDestination> _primaryDestinations(BuildContext context) {
    return _allDestinations(context).take(_primaryCount).toList();
  }

  /// Overflow destinations shown in the "More" bottom sheet.
  List<_NavDestination> _overflowDestinations(BuildContext context) {
    return _allDestinations(context).skip(_primaryCount).toList();
  }

  int _currentIndex(BuildContext context) {
    final all = _allDestinations(context);
    final location = GoRouterState.of(context).matchedLocation;
    int bestIndex = 0;
    int bestLength = 0;
    for (var i = 0; i < all.length; i++) {
      final path = all[i].path;
      if (location.startsWith(path) && path.length > bestLength) {
        bestIndex = i;
        bestLength = path.length;
      }
    }
    return bestIndex;
  }

  /// For the mobile bottom bar: returns the selected index within the 5-item
  /// bar (0-3 = primary, 4 = "More" when an overflow item is active).
  int _bottomBarIndex(BuildContext context) {
    final idx = _currentIndex(context);
    if (idx >= _primaryCount) return _primaryCount; // "More" tab
    return idx;
  }

  void _onDestinationSelected(BuildContext context, int index) async {
    final all = _allDestinations(context);
    final targetPath = all[index].path;

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

  void _showMoreSheet(BuildContext context) {
    final overflow = _overflowDestinations(context);
    final currentIdx = _currentIndex(context);
    final l10n = AppLocalizations.of(context)!;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Container(
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              ...overflow.map((dest) {
                final isActive = _allDestinations(context).indexOf(dest) == currentIdx;
                return ListTile(
                  leading: Icon(
                    isActive ? dest.selectedIcon : dest.icon,
                    color: isActive ? Theme.of(context).colorScheme.primary : null,
                  ),
                  title: Text(
                    dest.label,
                    style: isActive
                        ? TextStyle(
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          )
                        : null,
                  ),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    _onDestinationSelected(context, _allDestinations(context).indexOf(dest));
                  },
                );
              }),
              // Sign out option
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout),
                title: Text(l10n.signOut),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _handleSignOut(context);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 600;

    if (isWide) {
      return _buildWideLayout(context, _currentIndex(context));
    }
    return _buildNarrowLayout(context);
  }

  /// Wide layout: NavigationRail on the left side (unchanged – all items fit)
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
            destinations: _allDestinations(context)
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

  /// Narrow layout: bottom NavigationBar with 4 primary items + "More"
  Widget _buildNarrowLayout(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final primary = _primaryDestinations(context);
    final selectedBottomIdx = _bottomBarIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedBottomIdx,
        onDestinationSelected: (i) {
          if (i == _primaryCount) {
            _showMoreSheet(context);
          } else {
            _onDestinationSelected(context, i);
          }
        },
        destinations: [
          ...primary.map((d) => NavigationDestination(
                icon: Icon(d.icon),
                selectedIcon: Icon(d.selectedIcon),
                label: d.label,
              )),
          NavigationDestination(
            icon: const Icon(Icons.more_horiz_outlined),
            selectedIcon: const Icon(Icons.more_horiz),
            label: l10n.more,
          ),
        ],
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
