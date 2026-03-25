import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:minimal_saas_template/main.dart';

void main() {
  testWidgets('App initializes without crashing', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // Allow async _configureAmplify to complete (detects placeholder config)
    await tester.pumpAndSettle();

    // App should render successfully — verify a MaterialApp is present
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
