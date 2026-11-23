import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="legal-page">
      <div class="container">
        <nav class="nav">
          <a routerLink="/" class="logo-text">Train with Joe</a>
          <button class="btn-lang-dark" (click)="i18n.toggleLanguage()">
            {{ i18n.currentLang() === 'en' ? '🇩🇪 DE' : '🇬🇧 EN' }}
          </button>
        </nav>

        <article class="legal-content" *ngIf="i18n.currentLang() === 'en'">
          <h1>Privacy Policy</h1>
          <p class="last-updated">Last updated: {{ currentDate }}</p>

          <section>
            <h2>1. Introduction</h2>
            <p>
              Train with Joe ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and safeguard your information when you use our vocabulary learning application and
              website.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>
              When you create an account, we collect your email address and an encrypted password. We do not store
              passwords in plain text.
            </p>
            <h3>Usage Data</h3>
            <p>
              We collect information about how you use the app, including vocabulary lists created, training sessions
              completed, and learning progress. This data is used to provide and improve our services.
            </p>
            <h3>Device Information</h3>
            <p>
              We may collect basic device information such as device type, operating system, and browser type to
              optimize your experience.
            </p>
            <h3>Diagnostics and Performance Telemetry</h3>
            <p>
              The app sends diagnostics and performance telemetry to our service provider Dash0 so that we can keep the
              app reliable and fix problems. This includes app usage and performance data, error reports, the screens
              you open (page views, with any query string or fragment removed from web addresses), your device model,
              operating system and version, and the app version. Telemetry is linked to a pseudonymous user ID generated
              by our authentication service (AWS Cognito), together with your user name (the display name in your profile) so
              that we can recognize your sessions for support and diagnostics. If you have not set a display name, we
              send your login (email address) as the user name instead. We do not send your email address in any other
              way. Dash0 anonymizes
              IP addresses and stores only an approximate, city-level location. Session replay (recording of your
              screen) and profiling are turned off. We do not use this data for advertising, we do not sell it, and we
              do not share it for advertising or behavioral advertising.
            </p>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain our vocabulary learning services</li>
              <li>Track your learning progress and personalize your experience</li>
              <li>Process subscriptions and payments</li>
              <li>Send account-related communications (e.g., email verification)</li>
              <li>Improve and develop new features</li>
              <li>Monitor the diagnostics and reliability of the app and fix errors</li>
            </ul>
          </section>

          <section>
            <h2>4. AI-Powered Features</h2>
            <p>
              Our app uses AI services (Amazon Bedrock) to analyze images for vocabulary extraction and generate
              learning content. Images you submit for analysis are processed in real-time and are not stored by the AI
              service after processing.
            </p>
          </section>

          <section>
            <h2>5. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Amazon Web Services (AWS) infrastructure in the EU (Frankfurt) region.
              We use encryption in transit and at rest to protect your information. Authentication is handled through
              AWS Cognito with industry-standard security practices.
            </p>
          </section>

          <section>
            <h2>6. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>AWS (Amazon Web Services)</strong> — hosting, authentication, and data storage</li>
              <li>
                <strong>Dash0</strong> — processor for diagnostics and performance telemetry, with data stored in the EU
                (AWS region eu-west-1)
              </li>
              <li><strong>Stripe</strong> — payment processing for subscriptions</li>
              <li><strong>Apple App Store / Google Play Store</strong> — app distribution and in-app purchases</li>
            </ul>
            <p>These services have their own privacy policies governing how they handle your data.</p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your account, we will
              remove your personal data within 30 days, except where we are required to retain it by law. Telemetry
              stored at Dash0 is kept for 30 days (aggregated metrics for 13 months).
            </p>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your vocabulary data</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2>9. Children's Privacy</h2>
            <p>
              Our service is designed to be used by families. We do not knowingly collect personal information from
              children under 13 without parental consent. If you believe a child has provided us with personal
              information without consent, please contact us.
            </p>
          </section>

          <section>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
              the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2>11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or your data, please contact us at:</p>
            <p><a href="mailto:privacy&#64;trainwithjoe.app">privacy&#64;trainwithjoe.app</a></p>
          </section>
        </article>

        <article class="legal-content" *ngIf="i18n.currentLang() === 'de'">
          <h1>Datenschutzerklärung</h1>
          <p class="last-updated">Zuletzt aktualisiert: {{ currentDateDe }}</p>

          <section>
            <h2>1. Einleitung</h2>
            <p>
              Train with Joe („wir", „unser", „uns") verpflichtet sich zum Schutz Ihrer Privatsphäre. Diese
              Datenschutzerklärung erläutert, wie wir Ihre Daten erheben, verwenden und schützen, wenn Sie unsere
              Vokabellern-App und Website nutzen.
            </p>
          </section>

          <section>
            <h2>2. Erhobene Daten</h2>
            <h3>Kontoinformationen</h3>
            <p>
              Bei der Kontoerstellung erfassen wir Ihre E-Mail-Adresse und ein verschlüsseltes Passwort. Passwörter
              werden nicht im Klartext gespeichert.
            </p>
            <h3>Nutzungsdaten</h3>
            <p>
              Wir erfassen Informationen über Ihre App-Nutzung, einschließlich erstellter Vokabellisten, abgeschlossener
              Trainingseinheiten und Lernfortschritt. Diese Daten dienen der Bereitstellung und Verbesserung unserer
              Dienste.
            </p>
            <h3>Geräteinformationen</h3>
            <p>
              Wir können grundlegende Geräteinformationen wie Gerätetyp, Betriebssystem und Browsertyp erfassen, um Ihr
              Erlebnis zu optimieren.
            </p>
            <h3>Diagnose- und Leistungstelemetrie</h3>
            <p>
              Die App sendet Diagnose- und Leistungstelemetrie an unseren Dienstleister Dash0, damit wir die App
              zuverlässig betreiben und Fehler beheben können. Dazu gehören App-Nutzungs- und Leistungsdaten,
              Fehlerberichte, die von Ihnen geöffneten Bildschirme (Seitenaufrufe, wobei Query-Strings und Fragmente aus
              Webadressen entfernt werden), Ihr Gerätemodell, das Betriebssystem samt Version und die App-Version. Die
              Telemetrie ist mit einer pseudonymen Nutzer-ID verknüpft, die von unserem Authentifizierungsdienst (AWS
              Cognito) vergeben wird, zusammen mit Ihrem Benutzernamen (dem Anzeigenamen in Ihrem Profil), damit wir Ihre
              Sitzungen für Support und Diagnose zuordnen können. Haben Sie keinen Anzeigenamen festgelegt, senden wir
              stattdessen Ihre Anmeldekennung (E-Mail-Adresse) als Benutzernamen. Ihre E-Mail-Adresse senden wir
              nicht auf andere Weise. Dash0 anonymisiert
              IP-Adressen und speichert nur einen ungefähren Standort auf Stadtebene. Session Replay (Aufzeichnung Ihres
              Bildschirms) und Profiling sind deaktiviert. Wir verwenden diese Daten nicht für Werbung, verkaufen sie
              nicht und geben sie nicht für Werbezwecke oder verhaltensbasierte Werbung weiter.
            </p>
          </section>

          <section>
            <h2>3. Verwendung Ihrer Daten</h2>
            <p>Wir verwenden die erhobenen Daten, um:</p>
            <ul>
              <li>Unsere Vokabellern-Dienste bereitzustellen und zu pflegen</li>
              <li>Ihren Lernfortschritt zu verfolgen und Ihr Erlebnis zu personalisieren</li>
              <li>Abonnements und Zahlungen zu verarbeiten</li>
              <li>Kontobezogene Mitteilungen zu senden (z. B. E-Mail-Verifizierung)</li>
              <li>Neue Funktionen zu verbessern und zu entwickeln</li>
              <li>Diagnose und Zuverlässigkeit der App zu überwachen und Fehler zu beheben</li>
            </ul>
          </section>

          <section>
            <h2>4. KI-gestützte Funktionen</h2>
            <p>
              Unsere App nutzt KI-Dienste (Amazon Bedrock) zur Bildanalyse für die Vokabelextraktion und zur Generierung
              von Lerninhalten. Bilder, die Sie zur Analyse einreichen, werden in Echtzeit verarbeitet und nach der
              Verarbeitung nicht vom KI-Dienst gespeichert.
            </p>
          </section>

          <section>
            <h2>5. Datenspeicherung und Sicherheit</h2>
            <p>
              Ihre Daten werden sicher auf der Amazon Web Services (AWS) Infrastruktur in der EU-Region (Frankfurt)
              gespeichert. Wir verwenden Verschlüsselung bei der Übertragung und im Ruhezustand. Die Authentifizierung
              erfolgt über AWS Cognito mit branchenüblichen Sicherheitspraktiken.
            </p>
          </section>

          <section>
            <h2>6. Drittanbieter-Dienste</h2>
            <p>Wir nutzen folgende Drittanbieter-Dienste:</p>
            <ul>
              <li><strong>AWS (Amazon Web Services)</strong> — Hosting, Authentifizierung und Datenspeicherung</li>
              <li>
                <strong>Dash0</strong> — Auftragsverarbeiter für Diagnose- und Leistungstelemetrie, Speicherung in der
                EU (AWS-Region eu-west-1)
              </li>
              <li><strong>Stripe</strong> — Zahlungsabwicklung für Abonnements</li>
              <li><strong>Apple App Store / Google Play Store</strong> — App-Vertrieb und In-App-Käufe</li>
            </ul>
            <p>Diese Dienste haben eigene Datenschutzrichtlinien für den Umgang mit Ihren Daten.</p>
          </section>

          <section>
            <h2>7. Datenspeicherung</h2>
            <p>
              Wir bewahren Ihre Kontodaten auf, solange Ihr Konto aktiv ist. Wenn Sie Ihr Konto löschen, entfernen wir
              Ihre personenbezogenen Daten innerhalb von 30 Tagen, es sei denn, wir sind gesetzlich zur Aufbewahrung
              verpflichtet. Bei Dash0 gespeicherte Telemetrie wird 30 Tage aufbewahrt (aggregierte Metriken 13 Monate).
            </p>
          </section>

          <section>
            <h2>8. Ihre Rechte</h2>
            <p>Sie haben das Recht:</p>
            <ul>
              <li>Auf die personenbezogenen Daten zuzugreifen, die wir über Sie speichern</li>
              <li>Die Berichtigung ungenauer Daten zu verlangen</li>
              <li>Die Löschung Ihres Kontos und Ihrer Daten zu verlangen</li>
              <li>Ihre Vokabeldaten zu exportieren</li>
              <li>Ihre Einwilligung jederzeit zu widerrufen</li>
            </ul>
          </section>

          <section>
            <h2>9. Datenschutz für Kinder</h2>
            <p>
              Unser Dienst ist für die Nutzung durch Familien konzipiert. Wir erheben wissentlich keine
              personenbezogenen Daten von Kindern unter 13 Jahren ohne elterliche Einwilligung. Wenn Sie glauben, dass
              ein Kind uns ohne Einwilligung personenbezogene Daten übermittelt hat, kontaktieren Sie uns bitte.
            </p>
          </section>

          <section>
            <h2>10. Änderungen dieser Richtlinie</h2>
            <p>
              Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Über wesentliche Änderungen
              informieren wir Sie durch Veröffentlichung der neuen Richtlinie auf dieser Seite und Aktualisierung des
              Datums „Zuletzt aktualisiert".
            </p>
          </section>

          <section>
            <h2>11. Kontakt</h2>
            <p>Bei Fragen zu dieser Datenschutzerklärung oder Ihren Daten kontaktieren Sie uns unter:</p>
            <p><a href="mailto:privacy&#64;trainwithjoe.app">privacy&#64;trainwithjoe.app</a></p>
          </section>
        </article>

        <footer class="legal-footer">
          <a routerLink="/">{{ i18n.t('footer.backToHome') }}</a>
          <span class="separator">•</span>
          <a routerLink="/terms">{{ i18n.t('footer.terms') }}</a>
          <span class="separator">•</span>
          <a routerLink="/impressum">{{ i18n.t('footer.impressum') }}</a>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./legal.component.css'],
})
export class PrivacyComponent {
  currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  currentDateDe = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  constructor(public i18n: TranslationService) {}
}
