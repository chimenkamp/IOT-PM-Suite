// src/app/app.config.ts

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FFlowModule } from '@foblex/flow';

import { routes } from './app.routes';
import { NodeService } from './services/node.service';
import { MappingService } from './services/mapping.service';
import { PipelineService } from './services/pipeline.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(BrowserAnimationsModule, FFlowModule),
    NodeService,
    MappingService,
    PipelineService
  ]
};
