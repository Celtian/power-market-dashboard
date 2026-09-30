import { RenderMode } from '@angular/ssr';

import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  it('prerenders known routes', () => {
    expect(serverRoutes.slice(0, -1)).toEqual([
      { path: '', renderMode: RenderMode.Prerender },
      { path: 'solar', renderMode: RenderMode.Prerender },
      { path: 'balancing', renderMode: RenderMode.Prerender },
      { path: 'balancing/ladder', renderMode: RenderMode.Prerender },
    ]);
  });

  it('server-renders unknown routes with a 404 response', () => {
    expect(serverRoutes.at(-1)).toEqual({
      path: '**',
      renderMode: RenderMode.Server,
      status: 404,
    });
  });
});
