import express from 'express';
import { once } from 'node:events';
import { type Server, createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

import { createApiProxy } from './api-proxy';

const servers: Server[] = [];

async function listen(server: Server): Promise<string> {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  return `http://127.0.0.1:${address.port}`;
}

async function proxyFor(origin: string): Promise<string> {
  const app = express();
  app.use('/api', createApiProxy(origin));
  return listen(createServer(app));
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe('API proxy', () => {
  it('preserves the API path, response status, headers and body', async () => {
    const upstream = await listen(
      createServer((request, response) => {
        response.writeHead(201, { 'content-type': 'application/json', 'x-upstream': 'api' });
        response.end(JSON.stringify({ path: request.url }));
      }),
    );
    const proxy = await proxyFor(upstream);

    const response = await fetch(`${proxy}/api/data-status?detail=true`);

    expect(response.status).toBe(201);
    expect(response.headers.get('x-upstream')).toBe('api');
    await expect(response.json()).resolves.toEqual({ path: '/api/data-status?detail=true' });
  });

  it('returns 502 when the upstream API is unavailable', async () => {
    const unavailable = createServer();
    const origin = await listen(unavailable);
    await new Promise<void>((resolve, reject) =>
      unavailable.close((error) => (error ? reject(error) : resolve())),
    );
    servers.splice(servers.indexOf(unavailable), 1);
    const proxy = await proxyFor(origin);

    const response = await fetch(`${proxy}/api/data-status`);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: 'API is unavailable' });
  });

  it('streams SSE events without buffering or closing the connection', async () => {
    const upstream = await listen(
      createServer((_request, response) => {
        response.writeHead(200, {
          'cache-control': 'no-cache',
          'content-type': 'text/event-stream',
        });
        response.write('event: ready\ndata: {}\n\n');
        setTimeout(() => response.write('event: heartbeat\ndata: {}\n\n'), 20);
      }),
    );
    const proxy = await proxyFor(upstream);

    const response = await fetch(`${proxy}/api/events`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Missing SSE response body');

    let body = '';
    while (!body.includes('event: heartbeat')) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error('SSE connection closed before the heartbeat');
      body += new TextDecoder().decode(chunk.value);
    }
    await reader.cancel();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-accel-buffering')).toBe('no');
    expect(body).toContain('event: ready');
    expect(body).toContain('event: heartbeat');
  });
});
