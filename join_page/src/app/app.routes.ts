import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { PrivacyComponent } from './pages/privacy.component';
import { TermsComponent } from './pages/terms.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'terms', component: TermsComponent },
  { path: '**', redirectTo: '' },
];
