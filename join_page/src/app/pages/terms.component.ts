import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-terms',
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
          <h1>Terms of Service</h1>
          <p class="last-updated">Last updated: {{ currentDate }}</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Train with Joe ("the Service"), you agree to be bound by these Terms of Service. If
              you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              Train with Joe is a vocabulary learning application that uses AI-powered image analysis to help users
              build vocabulary lists with translations, definitions, and example sentences. The Service is available on
              iOS, Android, and web platforms.
            </p>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>
              To use the Service, you must create an account with a valid email address. You are responsible for
              maintaining the confidentiality of your account credentials and for all activities that occur under your
              account.
            </p>
          </section>

          <section>
            <h2>4. Subscriptions and Payments</h2>
            <p>
              Some features require a paid subscription. Subscriptions are billed on a recurring basis (monthly or
              annually) through the platform you subscribed on (App Store, Google Play, or Stripe). You can cancel your
              subscription at any time, and it will remain active until the end of the current billing period.
            </p>
            <p>Refunds are handled according to the policies of the respective platform (Apple, Google, or Stripe).</p>
          </section>

          <section>
            <h2>5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload content that is offensive, harmful, or violates third-party rights</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated tools to scrape or extract data from the Service</li>
            </ul>
          </section>

          <section>
            <h2>6. Intellectual Property</h2>
            <p>
              The Service, including its design, code, and content, is owned by Train with Joe and protected by
              intellectual property laws. Vocabulary lists you create are your own content, and you retain ownership of
              them. If you share them globally, others may use them but you can restrict the usage at any point in time.
            </p>
          </section>

          <section>
            <h2>7. AI-Generated Content</h2>
            <p>
              The Service uses AI to generate vocabulary content including translations, definitions, and example
              sentences. While we strive for accuracy, AI-generated content may contain errors. We do not guarantee the
              accuracy of AI-generated content and recommend verifying important information independently.
            </p>
          </section>

          <section>
            <h2>8. Availability and Modifications</h2>
            <p>
              We strive to keep the Service available at all times but do not guarantee uninterrupted access. We reserve
              the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Train with Joe shall not be liable for any indirect, incidental,
              special, or consequential damages arising from your use of the Service. Our total liability shall not
              exceed the amount you paid for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2>10. Termination</h2>
            <p>
              We may terminate or suspend your account if you violate these Terms. You may delete your account at any
              time. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2>11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Germany. Any disputes shall be resolved in the courts of Germany.
            </p>
          </section>

          <section>
            <h2>12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by posting the updated
              Terms on this page. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>If you have questions about these Terms, please contact us at:</p>
            <p><a href="mailto:legal&#64;trainwithjoe.app">legal&#64;trainwithjoe.app</a></p>
          </section>
        </article>

        <article class="legal-content" *ngIf="i18n.currentLang() === 'de'">
          <h1>Nutzungsbedingungen</h1>
          <p class="last-updated">Zuletzt aktualisiert: {{ currentDateDe }}</p>

          <section>
            <h2>1. Annahme der Bedingungen</h2>
            <p>
              Durch den Zugriff auf oder die Nutzung von Train with Joe („der Dienst") erklären Sie sich mit diesen
              Nutzungsbedingungen einverstanden. Wenn Sie diesen Bedingungen nicht zustimmen, nutzen Sie den Dienst
              bitte nicht.
            </p>
          </section>

          <section>
            <h2>2. Beschreibung des Dienstes</h2>
            <p>
              Train with Joe ist eine Vokabellern-App, die KI-gestützte Bildanalyse nutzt, um Nutzern beim Aufbau von
              Vokabellisten mit Übersetzungen, Definitionen und Beispielsätzen zu helfen. Der Dienst ist auf iOS,
              Android und im Web verfügbar.
            </p>
          </section>

          <section>
            <h2>3. Kontoregistrierung</h2>
            <p>
              Zur Nutzung des Dienstes müssen Sie ein Konto mit einer gültigen E-Mail-Adresse erstellen. Sie sind für
              die Vertraulichkeit Ihrer Zugangsdaten und alle Aktivitäten unter Ihrem Konto verantwortlich.
            </p>
          </section>

          <section>
            <h2>4. Abonnements und Zahlungen</h2>
            <p>
              Einige Funktionen erfordern ein kostenpflichtiges Abonnement. Abonnements werden wiederkehrend (monatlich
              oder jährlich) über die Plattform abgerechnet, auf der Sie sich angemeldet haben (App Store, Google Play
              oder Stripe). Sie können Ihr Abonnement jederzeit kündigen; es bleibt bis zum Ende des aktuellen
              Abrechnungszeitraums aktiv.
            </p>
            <p>
              Erstattungen werden gemäß den Richtlinien der jeweiligen Plattform (Apple, Google oder Stripe) gehandhabt.
            </p>
          </section>

          <section>
            <h2>5. Akzeptable Nutzung</h2>
            <p>Sie verpflichten sich, Folgendes zu unterlassen:</p>
            <ul>
              <li>Den Dienst für rechtswidrige Zwecke zu nutzen</li>
              <li>Inhalte hochzuladen, die beleidigend, schädlich sind oder Rechte Dritter verletzen</li>
              <li>Unbefugten Zugriff auf den Dienst oder seine Systeme zu erlangen</li>
              <li>Den Dienst zu stören oder zu beeinträchtigen</li>
              <li>Automatisierte Tools zum Scrapen oder Extrahieren von Daten aus dem Dienst zu verwenden</li>
            </ul>
          </section>

          <section>
            <h2>6. Geistiges Eigentum</h2>
            <p>
              Der Dienst, einschließlich Design, Code und Inhalte, ist Eigentum von Train with Joe und durch
              Urheberrechtsgesetze geschützt. Von Ihnen erstellte Vokabellisten sind Ihre eigenen Inhalte, und Sie
              behalten das Eigentum daran. Wenn Sie sie global teilen, können andere sie nutzen, aber Sie können die
              Nutzung jederzeit einschränken.
            </p>
          </section>

          <section>
            <h2>7. KI-generierte Inhalte</h2>
            <p>
              Der Dienst nutzt KI zur Generierung von Vokabelinhalten einschließlich Übersetzungen, Definitionen und
              Beispielsätzen. Obwohl wir nach Genauigkeit streben, können KI-generierte Inhalte Fehler enthalten. Wir
              garantieren nicht die Richtigkeit KI-generierter Inhalte und empfehlen, wichtige Informationen unabhängig
              zu überprüfen.
            </p>
          </section>

          <section>
            <h2>8. Verfügbarkeit und Änderungen</h2>
            <p>
              Wir bemühen uns, den Dienst jederzeit verfügbar zu halten, garantieren jedoch keinen ununterbrochenen
              Zugang. Wir behalten uns das Recht vor, Teile des Dienstes jederzeit mit angemessener Vorankündigung zu
              ändern, auszusetzen oder einzustellen.
            </p>
          </section>

          <section>
            <h2>9. Haftungsbeschränkung</h2>
            <p>
              Im gesetzlich zulässigen Rahmen haftet Train with Joe nicht für indirekte, zufällige, besondere oder
              Folgeschäden, die aus Ihrer Nutzung des Dienstes entstehen. Unsere Gesamthaftung übersteigt nicht den
              Betrag, den Sie in den 12 Monaten vor dem Anspruch für den Dienst gezahlt haben.
            </p>
          </section>

          <section>
            <h2>10. Kündigung</h2>
            <p>
              Wir können Ihr Konto kündigen oder sperren, wenn Sie gegen diese Bedingungen verstoßen. Sie können Ihr
              Konto jederzeit löschen. Nach der Kündigung erlischt Ihr Recht zur Nutzung des Dienstes sofort.
            </p>
          </section>

          <section>
            <h2>11. Anwendbares Recht</h2>
            <p>
              Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland. Streitigkeiten werden vor den
              Gerichten Deutschlands beigelegt.
            </p>
          </section>

          <section>
            <h2>12. Änderungen dieser Bedingungen</h2>
            <p>
              Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. Über wesentliche Änderungen informieren wir
              Sie durch Veröffentlichung der aktualisierten Bedingungen auf dieser Seite. Die fortgesetzte Nutzung des
              Dienstes nach Änderungen gilt als Annahme der neuen Bedingungen.
            </p>
          </section>

          <section>
            <h2>13. Kontakt</h2>
            <p>Bei Fragen zu diesen Bedingungen kontaktieren Sie uns unter:</p>
            <p><a href="mailto:legal&#64;trainwithjoe.app">legal&#64;trainwithjoe.app</a></p>
          </section>
        </article>

        <footer class="legal-footer">
          <a routerLink="/">{{ i18n.t('footer.backToHome') }}</a>
          <span class="separator">•</span>
          <a routerLink="/privacy">{{ i18n.t('footer.privacy') }}</a>
          <span class="separator">•</span>
          <a routerLink="/impressum">{{ i18n.t('footer.impressum') }}</a>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./legal.component.css'],
})
export class TermsComponent {
  currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  currentDateDe = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  constructor(public i18n: TranslationService) {}
}
