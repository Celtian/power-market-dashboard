import { Route } from '@angular/router';

import { marker as _ } from '@jsverse/transloco-keys-manager/marker';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'solar',
  },
  {
    path: 'solar',
    title: _('routes.solar'),
    loadComponent: () => import('./solar/solar-page').then(({ SolarPage }) => SolarPage),
  },
  {
    path: 'balancing',
    pathMatch: 'full',
    redirectTo: 'balancing/ladder',
  },
  {
    path: 'balancing/ladder',
    title: _('routes.balancing'),
    loadComponent: () =>
      import('./balancing/balancing-ladder-page').then(
        ({ BalancingLadderPage }) => BalancingLadderPage,
      ),
  },
  {
    path: '**',
    title: _('routes.not-found'),
    loadComponent: () =>
      import('./not-found/not-found-page').then(({ NotFoundPage }) => NotFoundPage),
  },
];
