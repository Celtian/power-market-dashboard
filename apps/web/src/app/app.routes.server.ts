import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'solar',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'balancing',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'balancing/ladder',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
