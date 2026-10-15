import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-delete-data',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
          <h1>{{ i18n.t('delete.title') }}</h1>

          <section>
            <p>{{ i18n.t('delete.intro') }}</p>
          </section>

          <ng-container *ngIf="!isSubmitted">
            <section>
              <h2>{{ i18n.t('delete.whatTitle') }}</h2>
              <ul>
                <li>{{ i18n.t('delete.what.account') }}</li>
                <li>{{ i18n.t('delete.what.vocab') }}</li>
                <li>{{ i18n.t('delete.what.profile') }}</li>
                <li>{{ i18n.t('delete.what.usage') }}</li>
              </ul>
            </section>

            <section>
              <h2>{{ i18n.t('delete.beforeTitle') }}</h2>
              <p>
                {{ i18n.t('delete.beforeNote') }}
                <a href="mailto:privacy&#64;trainwithjoe.app">privacy&#64;trainwithjoe.app</a>.
              </p>
            </section>

            <section *ngIf="!isConfigured">
              <p>{{ i18n.t('delete.manual') }}</p>
            </section>

            <section *ngIf="isConfigured">
              <form (ngSubmit)="submitDeletionRequest()">
                <div class="form-group">
                  <label for="delete-email">{{ i18n.t('delete.form.emailLabel') }}</label>
                  <input
                    id="delete-email"
                    type="email"
                    name="email"
                    [(ngModel)]="email"
                    [placeholder]="i18n.t('delete.form.emailPlaceholder')"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="delete-reason">{{ i18n.t('delete.form.reasonLabel') }}</label>
                  <textarea
                    id="delete-reason"
                    name="reason"
                    rows="3"
                    [(ngModel)]="reason"
                    [placeholder]="i18n.t('delete.form.reasonPlaceholder')"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label for="delete-confirm">{{ i18n.t('delete.form.confirmLabel') }}</label>
                  <input
                    id="delete-confirm"
                    type="text"
                    name="confirmText"
                    [(ngModel)]="confirmText"
                    [placeholder]="i18n.t('delete.form.confirmPlaceholder')"
                    required
                  />
                </div>

                <p class="form-error" *ngIf="message">{{ message }}</p>

                <button type="submit" class="btn-delete" [disabled]="!isFormValid || isLoading">
                  {{ isLoading ? i18n.t('delete.form.submitting') : i18n.t('delete.form.submit') }}
                </button>

                <p class="form-note">{{ i18n.t('delete.processingNote') }}</p>
              </form>
            </section>
          </ng-container>

          <section *ngIf="isSubmitted" class="success-box">
            <h2>{{ i18n.t('delete.success.title') }}</h2>
            <p>{{ i18n.t('delete.success.body') }}</p>
          </section>
        </article>

        <footer class="legal-footer">
          <a routerLink="/">{{ i18n.t('footer.backToHome') }}</a>
          <span class="separator">•</span>
          <a routerLink="/privacy">{{ i18n.t('footer.privacy') }}</a>
          <span class="separator">•</span>
          <a routerLink="/terms">{{ i18n.t('footer.terms') }}</a>
          <span class="separator">•</span>
          <a routerLink="/impressum">{{ i18n.t('footer.impressum') }}</a>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./legal.component.css'],
  styles: [
    `
      .form-group {
        margin-bottom: 20px;
      }
      .form-group label {
        display: block;
        font-size: 15px;
        font-weight: 700;
        color: #2d3436;
        margin-bottom: 8px;
      }
      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 12px 14px;
        font-size: 16px;
        font-family: inherit;
        color: #2d3436;
        background: #ffffff;
        border: 1px solid rgba(43, 108, 176, 0.25);
        border-radius: 10px;
        box-sizing: border-box;
      }
      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #2b6cb0;
      }
      .form-error {
        color: #c0392b;
        font-size: 15px;
        margin-bottom: 12px;
      }
      .form-note {
        font-size: 14px;
        color: #636e72;
        margin-top: 12px;
      }
      .btn-delete {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 22px;
        font-size: 16px;
        font-weight: 800;
        font-family: inherit;
        color: #ffffff;
        background: #e53e3e;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-delete:hover:not(:disabled) {
        background: #c53030;
      }
      .btn-delete:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .success-box {
        background: rgba(43, 108, 176, 0.06);
        border: 1px solid rgba(43, 108, 176, 0.15);
        border-radius: 12px;
        padding: 24px;
      }
    `,
  ],
})
export class DeleteDataComponent {
  currentYear = new Date().getFullYear();

  email = '';
  reason = '';
  confirmText = '';
  isSubmitted = false;
  isLoading = false;
  message = '';

  private deletionRequestUrl = resolveDeletionRequestUrl();

  constructor(public i18n: TranslationService) {}

  get isConfigured(): boolean {
    return this.deletionRequestUrl.length > 0;
  }

  get isFormValid(): boolean {
    return this.email.trim().length > 0 && this.confirmText === 'DELETE';
  }

  async submitDeletionRequest(): Promise<void> {
    if (!this.isFormValid) {
      this.message = this.i18n.t('delete.error.invalid');
      return;
    }

    if (!this.deletionRequestUrl) {
      // Graceful degradation: no endpoint configured, direct the user to email.
      this.message = this.i18n.t('delete.manual');
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      const response = await fetch(this.deletionRequestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email.trim(),
          reason: this.reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      this.isSubmitted = true;
    } catch {
      this.message = this.i18n.t('delete.error.failed');
    } finally {
      this.isLoading = false;
    }
  }
}

function resolveDeletionRequestUrl(): string {
  const url = (environment as { deletionRequestUrl?: string }).deletionRequestUrl ?? '';
  // Treat the build-time placeholder as "not configured" so the page degrades gracefully.
  if (!url || url.startsWith('REPLACE_WITH_')) {
    return '';
  }
  return url;
}
