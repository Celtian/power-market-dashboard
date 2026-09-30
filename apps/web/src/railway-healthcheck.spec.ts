import express from 'express';
import { once } from 'node:events';
import { type Server, createServer, request as httpRequest } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

import { railwayHealthcheck } from './railway-healthcheck';

let server: Server | undefined;

async function startServer(): Promise<string> {
  const app = express();
  app.get('/', railwayHealthcheck, (_request, response) => response.redirect('/solar'));
  server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  return 'http://127.0.0.1:' + address.port;
}
async function get(origin: string, host: string) {
  return new Promise<{ body: string; location?: string; status: number }>((resolve, reject) => {
    const request = httpRequest(origin, { headers: { host } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => (body += chunk));
      response.on('end', () =>
        resolve({
          body,
          location: response.headers.location,
          status: response.statusCode ?? 0,
        }),
      );
    });
    request.on('error', reject);
    request.end();
  });
}

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server?.close((error) => (error ? reject(error) : resolve())),
  );
  server = undefined;
});

describe('Railway healthcheck', () => {
  it('returns 200 for the internal Railway healthcheck host', async () => {
    const origin = await startServer();

    const response = await get(origin, 'healthcheck.railway.app');
    expect(response.status).toBe(200);
    expect(response.body).toBe('ok');
  });

  it('preserves the public root route behavior for every other host', async () => {
    const origin = await startServer();

    const response = await get(origin, 'dashboard.example.com');
    expect(response.status).toBe(302);
    expect(response.location).toBe('/solar');
  });
});
