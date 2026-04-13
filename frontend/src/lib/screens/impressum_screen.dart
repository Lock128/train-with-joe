import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Impressum (legal notice) screen as required by German law (§ 5 TMG).
class ImpressumScreen extends StatelessWidget {
  const ImpressumScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Impressum')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Angaben gemäß § 5 TMG',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                const Text(
                  'Johannes Koch\n'
                  'Kinzigstrasse 51\n'
                  '64625 Bensheim\n'
                  'Germany',
                  style: TextStyle(fontSize: 16, height: 1.6),
                ),
                const SizedBox(height: 32),
                Text('Kontakt',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                const Text(
                  'Telefon: 0172 6283076',
                  style: TextStyle(fontSize: 16, height: 1.6),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () => launchUrl(
                    Uri.parse('mailto:lockhead@lockhead.info'),
                    mode: LaunchMode.externalApplication,
                  ),
                  child: const Text(
                    'E-Mail: lockhead@lockhead.info',
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.6,
                      color: Color(0xFF2B6CB0),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
