import { initDash0 } from './dash0';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ShellComponent } from './app/shell.component';
import { routes } from './app/app.routes';

// Start Dash0 before Angular bootstraps so startup and navigation are captured.
initDash0();

bootstrapApplication(ShellComponent, {
  providers: [provideRouter(routes)],
}).catch((err) => console.error(err));
