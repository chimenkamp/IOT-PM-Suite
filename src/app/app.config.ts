import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FFlowModule } from '@foblex/flow';

import { routes } from './app.routes';
import { NodeService } from './services/node.service';
import { MappingService } from './services/mapping.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserAnimationsModule, FFlowModule),
    NodeService,
    MappingService
  ]
};
