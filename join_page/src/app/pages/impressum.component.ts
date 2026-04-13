import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="legal-page">
      <div class="container">
        <nav class="nav">
          <a routerLink="/" class="logo-text">Train with Joe</a>
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
          <a routerLink="/">← Back to Home</a>
          <span class="separator">•</span>
          <a routerLink="/privacy">Privacy Policy</a>
          <span class="separator">•</span>
          <a routerLink="/terms">Terms of Service</a>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./legal.component.css'],
})
export class ImpressumComponent {}
