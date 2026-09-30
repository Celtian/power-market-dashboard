import type { RequestHandler } from 'express';
import { type OutgoingHttpHeaders, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function forwardedHeaders(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  target: URL,
): OutgoingHttpHeaders {
  const forwarded: OutgoingHttpHeaders = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined && !hopByHopHeaders.has(name.toLowerCase())) {
      forwarded[name] = value;
    }
  }

  forwarded.host = target.host;
  return forwarded;
}

export function createApiProxy(apiOrigin: string): RequestHandler {
  const origin = new URL(apiOrigin);
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') {
    throw new Error('API_ORIGIN must use http or https');
  }

  const request = origin.protocol === 'https:' ? httpsRequest : httpRequest;

  return (incoming, outgoing) => {
    const target = new URL(incoming.originalUrl, origin);
    const upstream = request(
      target,
      {
        headers: forwardedHeaders(incoming.headers, target),
        method: incoming.method,
      },
      (response) => {
        outgoing.status(response.statusCode ?? 502);

        for (const [name, value] of Object.entries(response.headers)) {
          if (value !== undefined && !hopByHopHeaders.has(name.toLowerCase())) {
            outgoing.setHeader(name, value);
          }
        }

        if (response.headers['content-type']?.startsWith('text/event-stream')) {
          outgoing.setHeader('x-accel-buffering', 'no');
          outgoing.flushHeaders();
        }

        response.pipe(outgoing);
      },
    );

    upstream.on('error', () => {
      if (outgoing.headersSent) {
        outgoing.destroy();
        return;
      }

      outgoing.status(502).json({ message: 'API is unavailable' });
    });

    incoming.on('aborted', () => upstream.destroy());
    outgoing.on('close', () => {
      if (!outgoing.writableEnded) upstream.destroy();
    });
    incoming.pipe(upstream);
  };
}
