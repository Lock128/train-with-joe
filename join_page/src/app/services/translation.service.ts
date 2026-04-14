import { Injectable, signal } from '@angular/core';

export type Language = 'en' | 'de';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private lang = signal<Language>(this.getInitialLanguage());

  currentLang = this.lang.asReadonly();

  private translations: Record<string, Record<Language, string>> = {
    // Nav
    'nav.features': { en: 'Features', de: 'Funktionen' },
    'nav.getStarted': { en: 'Get Started', de: 'Loslegen' },
    'nav.login': { en: 'Login', de: 'Anmelden' },
    'nav.pricing': { en: 'Pricing', de: 'Preise' },

    // Hero
    'hero.badge': { en: 'FUN LEARNING PLATFORM', de: 'SPASSIGE LERNPLATTFORM' },
    'hero.title': { en: 'Make Vocabulary Learning Fun!', de: 'Vokabellernen mit Spaß!' },
    'hero.subtitle': {
      en: 'Help your kids master new words every day with fun, interactive vocabulary games and daily challenges.',
      de: 'Hilf deinen Kindern, jeden Tag neue Wörter mit lustigen, interaktiven Vokabelspielen und täglichen Herausforderungen zu lernen.',
    },
    'hero.words': { en: 'Words', de: 'Wörter' },
    'hero.games': { en: 'Games', de: 'Spiele' },
    'hero.forKids': { en: 'Kids', de: 'Kinder' },
    'hero.for': { en: 'For', de: 'Für' },
    'hero.fun': { en: 'Fun', de: 'Tolle' },
    'hero.startFree': { en: 'Start Learning Free', de: 'Kostenlos starten' },
    'hero.learnMore': { en: 'Learn More', de: 'Mehr erfahren' },
    'hero.noCreditCard': { en: '✓ No credit card required', de: '✓ Keine Kreditkarte nötig' },
    'hero.freeTier': { en: '✓ Free tier available', de: '✓ Kostenlose Version verfügbar' },
    'hero.cancelAnytime': { en: '✓ Cancel anytime', de: '✓ Jederzeit kündbar' },

    // Features section
    'features.title': {
      en: 'Everything Your Kids Need to Learn Vocabulary',
      de: 'Alles, was deine Kinder zum Vokabellernen brauchen',
    },
    'features.subtitle': {
      en: 'Fun and engaging features that make learning new words exciting',
      de: 'Spaßige und fesselnde Funktionen, die das Lernen neuer Wörter spannend machen',
    },
    'features.games.title': { en: 'Vocabulary Games', de: 'Vokabelspiele' },
    'features.games.desc': {
      en: 'Interactive word games that make learning fun. Match words, solve puzzles, and build vocabulary through play.',
      de: 'Interaktive Wortspiele, die das Lernen zum Spaß machen. Wörter zuordnen, Rätsel lösen und spielerisch den Wortschatz erweitern.',
    },
    'features.progress.title': { en: 'Progress Tracking', de: 'Fortschrittsverfolgung' },
    'features.progress.desc': {
      en: "Track your child's learning journey with detailed progress reports, streaks, and achievement milestones.",
      de: 'Verfolge den Lernfortschritt deines Kindes mit detaillierten Berichten, Serien und Meilensteinen.',
    },
    'features.parent.title': { en: 'Parent Dashboard', de: 'Eltern-Dashboard' },
    'features.parent.desc': {
      en: "Stay informed about your child's progress with a dedicated parent dashboard and weekly reports.",
      de: 'Bleib über den Fortschritt deines Kindes informiert mit einem eigenen Eltern-Dashboard und wöchentlichen Berichten.',
    },
    'features.challenges.title': { en: 'Daily Challenges', de: 'Tägliche Herausforderungen' },
    'features.challenges.desc': {
      en: 'New word challenges every day to keep kids engaged and motivated to learn something new.',
      de: 'Jeden Tag neue Wort-Herausforderungen, um Kinder motiviert und engagiert zu halten.',
    },
    'features.languages.title': { en: 'Multiple Languages', de: 'Mehrere Sprachen' },
    'features.languages.desc': {
      en: 'Support for multiple languages so kids can learn vocabulary in the language they need most.',
      de: 'Unterstützung für mehrere Sprachen, damit Kinder Vokabeln in der Sprache lernen können, die sie am meisten brauchen.',
    },
    'features.rewards.title': { en: 'Fun Rewards', de: 'Tolle Belohnungen' },
    'features.rewards.desc': {
      en: 'Earn badges, stars, and rewards for completing challenges and reaching vocabulary goals.',
      de: 'Verdiene Abzeichen, Sterne und Belohnungen für abgeschlossene Herausforderungen und erreichte Vokabelziele.',
    },
    'features.adaptive.title': { en: 'Adaptive Learning', de: 'Adaptives Lernen' },
    'features.adaptive.desc': {
      en: "AI-powered learning that adapts to each child's level and pace for optimal vocabulary growth.",
      de: 'KI-gestütztes Lernen, das sich an das Niveau und Tempo jedes Kindes anpasst.',
    },
    'features.offline.title': { en: 'Offline Mode', de: 'Offline-Modus' },
    'features.offline.desc': {
      en: 'Download word packs and practice anywhere, even without an internet connection.',
      de: 'Lade Wortpakete herunter und übe überall, auch ohne Internetverbindung.',
    },
    'features.safe.title': { en: 'Safe for Kids', de: 'Sicher für Kinder' },
    'features.safe.desc': {
      en: 'Child-safe environment with no ads, no social features, and full parental controls.',
      de: 'Kindersichere Umgebung ohne Werbung, ohne soziale Funktionen und mit voller Elternkontrolle.',
    },

    // Why kids love it
    'why.title': { en: 'Why Kids Love It', de: 'Warum Kinder es lieben' },
    'why.subtitle': {
      en: 'Designed with kids in mind, powered by the latest technology',
      de: 'Für Kinder entwickelt, mit neuester Technologie',
    },
    'why.engaging.title': { en: 'Engaging Content', de: 'Fesselnde Inhalte' },
    'why.engaging.1': { en: 'Age-appropriate word lists', de: 'Altersgerechte Wortlisten' },
    'why.engaging.2': { en: 'Colorful illustrations', de: 'Bunte Illustrationen' },
    'why.engaging.3': { en: 'Fun sound effects', de: 'Lustige Soundeffekte' },
    'why.engaging.4': { en: 'Animated characters', de: 'Animierte Charaktere' },
    'why.engaging.5': { en: 'Story-based learning', de: 'Geschichtenbasiertes Lernen' },
    'why.engaging.6': { en: 'Interactive quizzes', de: 'Interaktive Quizze' },
    'why.works.title': { en: 'Works Everywhere', de: 'Funktioniert überall' },
    'why.works.1': { en: 'Web browser', de: 'Webbrowser' },
    'why.works.2': { en: 'iPhone and iPad', de: 'iPhone und iPad' },
    'why.works.3': { en: 'Android phones and tablets', de: 'Android-Handys und -Tablets' },
    'why.works.4': { en: 'Syncs across devices', de: 'Synchronisiert über alle Geräte' },
    'why.works.5': { en: 'Offline support', de: 'Offline-Unterstützung' },
    'why.works.6': { en: 'Low data usage', de: 'Geringer Datenverbrauch' },
    'why.parents.title': { en: 'Parents Love It Too', de: 'Eltern lieben es auch' },
    'why.parents.1': { en: 'Weekly progress emails', de: 'Wöchentliche Fortschritts-E-Mails' },
    'why.parents.2': { en: 'Screen time controls', de: 'Bildschirmzeit-Kontrolle' },
    'why.parents.3': { en: 'No ads or in-app purchases', de: 'Keine Werbung oder In-App-Käufe' },
    'why.parents.4': { en: 'Educational content only', de: 'Nur Bildungsinhalte' },
    'why.parents.5': { en: 'COPPA compliant', de: 'COPPA-konform' },
    'why.parents.6': { en: 'Secure and private', de: 'Sicher und privat' },

    // CTA / Register
    'cta.title': { en: 'Ready to Start Learning?', de: 'Bereit zum Lernen?' },
    'cta.subtitle': {
      en: 'Join Train with Joe and help your kids build an amazing vocabulary',
      de: 'Tritt Train with Joe bei und hilf deinen Kindern, einen tollen Wortschatz aufzubauen',
    },
    'form.email': { en: 'Enter your email address', de: 'E-Mail-Adresse eingeben' },
    'form.password': { en: 'Create a password', de: 'Passwort erstellen' },
    'form.confirmPassword': { en: 'Confirm your password', de: 'Passwort bestätigen' },
    'form.passwordHint': {
      en: 'Min 8 characters with uppercase, lowercase, number, and symbol.',
      de: 'Mind. 8 Zeichen mit Groß-, Kleinbuchstaben, Zahl und Sonderzeichen.',
    },
    'form.submit': { en: 'Start Learning Free', de: 'Kostenlos starten' },
    'form.submitting': { en: 'Creating account...', de: 'Konto wird erstellt...' },
    'form.terms': { en: 'By signing up, you agree to our', de: 'Mit der Anmeldung stimmst du unseren' },
    'form.termsLink': { en: 'Terms of Service', de: 'Nutzungsbedingungen' },
    'form.and': { en: 'and', de: 'und der' },
    'form.privacyLink': { en: 'Privacy Policy', de: 'Datenschutzerklärung' },
    'form.zu': { en: '', de: 'zu' },
    'form.verifyInstructions': {
      en: 'We sent a verification code to',
      de: 'Wir haben einen Bestätigungscode gesendet an',
    },
    'form.verifyPlaceholder': { en: 'Enter 6-digit code', de: '6-stelligen Code eingeben' },
    'form.verify': { en: 'Verify & Start Learning', de: 'Bestätigen & Loslegen' },
    'form.verifying': { en: 'Verifying...', de: 'Wird überprüft...' },

    // Validation messages
    'error.invalidEmail': { en: 'Please enter a valid email', de: 'Bitte gib eine gültige E-Mail-Adresse ein' },
    'error.shortPassword': {
      en: 'Password must be at least 8 characters',
      de: 'Das Passwort muss mindestens 8 Zeichen lang sein',
    },
    'error.passwordMismatch': { en: 'Passwords do not match', de: 'Passwörter stimmen nicht überein' },
    'error.enterCode': { en: 'Please enter the verification code', de: 'Bitte gib den Bestätigungscode ein' },
    'error.usernameExists': {
      en: 'An account with this email already exists.',
      de: 'Ein Konto mit dieser E-Mail existiert bereits.',
    },
    'error.invalidPassword': {
      en: 'Password must include uppercase, lowercase, number, and symbol.',
      de: 'Passwort muss Groß-, Kleinbuchstaben, Zahl und Sonderzeichen enthalten.',
    },
    'error.codeMismatch': {
      en: 'Invalid verification code. Please try again.',
      de: 'Ungültiger Bestätigungscode. Bitte versuche es erneut.',
    },
    'error.expiredCode': {
      en: 'Verification code expired. Please register again.',
      de: 'Bestätigungscode abgelaufen. Bitte registriere dich erneut.',
    },
    'error.limitExceeded': {
      en: 'Too many attempts. Please try again later.',
      de: 'Zu viele Versuche. Bitte versuche es später erneut.',
    },
    'error.generic': { en: 'Something went wrong', de: 'Etwas ist schiefgelaufen' },
    'success.checkEmail': {
      en: 'Check your email for a verification code.',
      de: 'Prüfe deine E-Mail für den Bestätigungscode.',
    },
    'success.verified': { en: 'Email verified. Signing you in...', de: 'E-Mail bestätigt. Du wirst angemeldet...' },
    'error.autoLoginFailed': {
      en: 'Account created but auto-login failed. Redirecting to login...',
      de: 'Konto erstellt, aber automatische Anmeldung fehlgeschlagen. Weiterleitung...',
    },

    // Pricing section
    'pricing.title': { en: 'Choose Your Plan', de: 'Wähle deinen Plan' },
    'pricing.subtitle': { en: 'Start free and upgrade as you grow', de: 'Starte kostenlos und upgrade bei Bedarf' },
    'pricing.free.name': { en: 'Free', de: 'Kostenlos' },
    'pricing.free.price': { en: '$0', de: '0 €' },
    'pricing.free.period': { en: 'Forever free', de: 'Für immer kostenlos' },
    'pricing.free.scans': { en: '5 image scans total', de: '5 Bild-Scans insgesamt' },
    'pricing.free.lists': { en: '5 vocabulary lists', de: '5 Vokabellisten' },
    'pricing.free.ai': { en: 'AI Training', de: 'KI-Training' },
    'pricing.free.btn': { en: 'Get Started', de: 'Loslegen' },
    'pricing.basic.name': { en: 'Basic', de: 'Basis' },
    'pricing.basic.price': { en: '$2.99', de: '2,99 €' },
    'pricing.basic.per': { en: '/mo', de: '/Monat' },
    'pricing.basic.period': { en: 'Billed monthly', de: 'Monatliche Abrechnung' },
    'pricing.basic.scans': { en: '25 image scans/mo', de: '25 Bild-Scans/Monat' },
    'pricing.basic.lists': { en: 'Unlimited vocabulary lists', de: 'Unbegrenzte Vokabellisten' },
    'pricing.basic.ai': { en: 'AI Training', de: 'KI-Training' },
    'pricing.basic.btn': { en: 'Get Started', de: 'Loslegen' },
    'pricing.pro.name': { en: 'Pro', de: 'Pro' },
    'pricing.pro.badge': { en: 'Recommended', de: 'Empfohlen' },
    'pricing.pro.price': { en: '$9.99', de: '9,99 €' },
    'pricing.pro.per': { en: '/mo', de: '/Monat' },
    'pricing.pro.period': { en: 'Billed monthly', de: 'Monatliche Abrechnung' },
    'pricing.pro.scans': { en: 'Unlimited image scans', de: 'Unbegrenzte Bild-Scans' },
    'pricing.pro.lists': { en: 'Unlimited vocabulary lists', de: 'Unbegrenzte Vokabellisten' },
    'pricing.pro.ai': { en: 'AI Training', de: 'KI-Training' },
    'pricing.pro.comingSoon': { en: 'Coming Soon', de: 'Demnächst' },
    'pricing.pro.btn': { en: 'Get Started', de: 'Loslegen' },

    // Footer
    'footer.rights': { en: 'All rights reserved.', de: 'Alle Rechte vorbehalten.' },
    'footer.privacy': { en: 'Privacy Policy', de: 'Datenschutz' },
    'footer.terms': { en: 'Terms of Service', de: 'Nutzungsbedingungen' },
    'footer.impressum': { en: 'Impressum', de: 'Impressum' },
    'footer.contact': { en: 'Contact', de: 'Kontakt' },
    'footer.backToHome': { en: '← Back to Home', de: '← Zurück zur Startseite' },
  };

  t(key: string): string {
    const entry = this.translations[key];
    return entry ? entry[this.lang()] : key;
  }

  setLanguage(lang: Language) {
    this.lang.set(lang);
    localStorage.setItem('twj-lang', lang);
    document.documentElement.lang = lang;
  }

  toggleLanguage() {
    this.setLanguage(this.lang() === 'en' ? 'de' : 'en');
  }

  private getInitialLanguage(): Language {
    const stored = localStorage.getItem('twj-lang');
    if (stored === 'en' || stored === 'de') return stored;
    const browserLang = navigator.language.substring(0, 2);
    return browserLang === 'de' ? 'de' : 'en';
  }
}
