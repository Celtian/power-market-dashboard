import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'solar',
  },
  {
    path: 'solar',
    title: 'Solar | Power Market Dashboard',
    loadComponent: () =>
      import('./solar/solar-page').then(({ SolarPage }) => SolarPage),
  },
  {
    path: 'balancing',
    pathMatch: 'full',
    redirectTo: 'balancing/ladder',
  },
  {
    path: 'balancing/ladder',
    title: 'Balancing | Power Market Dashboard',
    loadComponent: () =>
      import('./balancing/balancing-ladder-page').then(
        ({ BalancingLadderPage }) => BalancingLadderPage,
      ),
  },
  {
    path: '**',
    redirectTo: 'solar',
  },
];
