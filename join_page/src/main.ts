import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ShellComponent } from './app/shell.component';
import { routes } from './app/app.routes';

bootstrapApplication(ShellComponent, {
  providers: [provideRouter(routes)],
}).catch((err) => console.error(err));
