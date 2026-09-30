import type { RequestHandler } from 'express';

export const railwayHealthcheck: RequestHandler = (request, response, next) => {
  if (request.hostname !== 'healthcheck.railway.app') {
    next();
    return;
  }

  response.status(200).type('text/plain').send('ok');
};
