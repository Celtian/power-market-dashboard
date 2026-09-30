import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { TRANSLOCO_LOADER } from '@jsverse/transloco';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { TranslocoServerLoader } from './transloco-loader.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: TRANSLOCO_LOADER, useClass: TranslocoServerLoader },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
