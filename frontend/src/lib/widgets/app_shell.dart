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
    _NavDestination('/home', Icons.home_outlined, Icons.home_rounded, l10n.home),
    _NavDestination('/vocabulary/analyze', Icons.camera_alt_outlined, Icons.camera_alt_rounded, l10n.scan),
    _NavDestination('/vocabulary', Icons.list_alt_outlined, Icons.list_alt_rounded, l10n.lists),
    _NavDestination('/trainings', Icons.quiz_outlined, Icons.quiz_rounded, l10n.training),
    _NavDestination('/statistics', Icons.bar_chart_outlined, Icons.bar_chart_rounded, l10n.statistics),
    _NavDestination('/subscription', Icons.workspace_premium_outlined, Icons.workspace_premium_rounded, l10n.subscription),
    _NavDestination('/info', Icons.info_outline_rounded, Icons.info_rounded, l10n.info),
    _NavDestination('/settings', Icons.settings_outlined, Icons.settings_rounded, l10n.settings),
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
    final colorScheme = Theme.of(context).colorScheme;

    showModalBottomSheet(
      context: context,
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.outlineVariant.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    l10n.more,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
              ),
              ...overflow.map((dest) {
                final destIndex = _allDestinations(context).indexWhere((d) => d.path == dest.path);
                final isActive = destIndex == currentIdx;
                return ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isActive
                          ? colorScheme.primaryContainer
                          : colorScheme.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isActive ? dest.selectedIcon : dest.icon,
                      color: isActive ? colorScheme.primary : colorScheme.onSurfaceVariant,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    dest.label,
                    style: TextStyle(
                      color: isActive ? colorScheme.primary : colorScheme.onSurface,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    final all = _allDestinations(context);
                    final index = all.indexWhere((d) => d.path == dest.path);
                    if (index >= 0) {
                      _onDestinationSelected(context, index);
                    }
                  },
                );
              }),
              const Divider(indent: 16, endIndent: 16),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.logout_rounded, color: Colors.red.shade400, size: 20),
                ),
                title: Text(
                  l10n.signOut,
                  style: TextStyle(color: Colors.red.shade600, fontWeight: FontWeight.w500),
                ),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _handleSignOut(context);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 600;

    if (isWide) {
      return _buildWideLayout(context, _currentIndex(context));
    }
    return _buildNarrowLayout(context);
  }

  /// Wide layout: NavigationRail on the left side
  Widget _buildWideLayout(BuildContext context, int selectedIndex) {
    final colorScheme = Theme.of(context).colorScheme;

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
                padding: const EdgeInsets.only(bottom: 12.0, top: 8.0),
                child: Column(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.school_rounded,
                        color: colorScheme.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Train\nwith Joe',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: colorScheme.primary,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              trailing: Expanded(
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 20.0),
                    child: IconButton(
                      icon: Icon(Icons.logout_rounded, color: colorScheme.onSurfaceVariant),
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
            VerticalDivider(
              thickness: 1,
              width: 1,
              color: colorScheme.outlineVariant.withValues(alpha: 0.3),
            ),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }

  /// Narrow layout: bottom NavigationBar with 4 primary items + "More"
  Widget _buildNarrowLayout(BuildContext context) {
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
          const NavigationDestination(
            icon: Icon(Icons.more_horiz_outlined),
            selectedIcon: Icon(Icons.more_horiz_rounded),
            label: 'More',
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
