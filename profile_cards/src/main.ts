import { initDash0 } from './dash0';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Start Dash0 before Angular bootstraps so startup and navigation are captured.
initDash0();

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
