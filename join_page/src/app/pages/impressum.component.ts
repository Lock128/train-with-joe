import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-impressum',
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

        <article class="legal-content">
          <h1>Impressum</h1>

          <section>
            <h2>Angaben gemäß § 5 TMG</h2>
            <p>
              Johannes Koch<br />
              Kinzigstrasse 51<br />
              64625 Bensheim<br />
              Germany
            </p>
          </section>

          <section>
            <h2>Kontakt</h2>
            <p>
              Telefon: 0172 6283076<br />
              E-Mail: <a href="mailto:lockhead&#64;lockhead.info">lockhead&#64;lockhead.info</a>
            </p>
          </section>
        </article>

        <footer class="legal-footer">
          <a routerLink="/">{{ i18n.t('footer.backToHome') }}</a>
          <span class="separator">•</span>
          <a routerLink="/privacy">{{ i18n.t('footer.privacy') }}</a>
          <span class="separator">•</span>
          <a routerLink="/terms">{{ i18n.t('footer.terms') }}</a>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./legal.component.css'],
})
export class ImpressumComponent {
  constructor(public i18n: TranslationService) {}
}
