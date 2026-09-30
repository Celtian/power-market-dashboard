import { ChildProcess, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';

import { createDataSource } from './lib/data-source';

export async function waitFor<T>(check: () => Promise<T | false>, ms = 15000): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await check();
    if (value !== false) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for observable condition');
}
export async function testDatabase() {
  const url =
    process.env.TEST_DATABASE_URL ||
    'postgresql://power_market:power_market@localhost:5432/power_market';
  const admin = await createDataSource(url).initialize();
  const name = `market_test_${randomUUID().replace(/-/g, '')}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  const address = new URL(url);
  address.pathname = `/${name}`;
  const connectionString = address.toString();
  const migrate = (direction: 'up' | 'down') => {
    const result = spawnSync('bun', ['run', direction === 'up' ? 'db:migrate' : 'db:rollback'], {
      env: { ...process.env, DATABASE_URL: connectionString },
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  };
  const db = createDataSource(connectionString);
  try {
    migrate('up');
    await db.initialize();
    process.env.DATABASE_URL = connectionString;
  } catch (error) {
    if (db.isInitialized) await db.destroy();
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.destroy();
    throw error;
  }
  return {
    db,
    connectionString,
    migrate,
    close: async () => {
      await db.destroy();
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      await admin.destroy();
    },
  };
}
async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}
export async function startApp(app: 'api' | 'importer', env: Record<string, string>) {
  const port = await freePort();
  let output = '';
  const child = spawn(process.execPath, [`dist/apps/${app}/main.js`], {
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString();
  });
  const url = `http://127.0.0.1:${port}/api`;
  try {
    await waitFor(async () => {
      if (child.exitCode !== null) throw new Error(`Application exited: ${output}`);
      try {
        return (await fetch(url)).ok || false;
      } catch {
        return false;
      }
    });
  } catch (error) {
    await stopApp(child);
    throw error;
  }
  return { child, url, output: () => output };
}
export async function stopApp(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
  try {
    await exited;
  } finally {
    clearTimeout(timeout);
  }
}
export async function readEvent(reader: ReadableStreamDefaultReader<Uint8Array>, type: string) {
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) throw new Error('SSE closed before expected event');
    buffer += new TextDecoder().decode(value);
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames)
      if (frame.includes(`event: ${type}`)) {
        const data = /^data: (.+)$/m.exec(frame)?.[1];
        if (!data) throw new Error('Missing SSE data');
        return {
          id: /^id: (.+)$/m.exec(frame)?.[1],
          data: JSON.parse(data) as Record<string, unknown>,
        };
      }
  }
}
