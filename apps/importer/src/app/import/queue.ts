import { RmqOptions, Transport } from '@nestjs/microservices';
import { connect } from 'amqplib';

function prefix() {
  const value = process.env.RABBITMQ_QUEUE_PREFIX || 'market';
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error('Invalid queue prefix');
  return value;
}
export const IMPORT_PATTERN = 'market.import.v1';
export function queueOptions(
  priority: 'live' | 'history',
  consumer = true,
): RmqOptions {
  const url = process.env.RABBITMQ_URL;
  if (!url) throw new Error('RABBITMQ_URL is required');
  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: `${prefix()}.import.${priority}`,
      noAck: !consumer,
      prefetchCount: 1,
      persistent: true,
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': `${prefix()}.dead`,
          'x-dead-letter-routing-key': 'failed',
        },
      },
    },
  };
}
export async function provisionQueues() {
  const url = process.env.RABBITMQ_URL;
  if (!url) throw new Error('RABBITMQ_URL is required');
  const connection = await connect(url);
  try {
    const channel = await connection.createChannel();
    await channel.assertExchange(`${prefix()}.dead`, 'direct', {
      durable: true,
    });
    await channel.assertQueue(`${prefix()}.import.dead`, { durable: true });
    await channel.bindQueue(
      `${prefix()}.import.dead`,
      `${prefix()}.dead`,
      'failed',
    );
    for (const priority of ['live', 'history'] as const) {
      const config = queueOptions(priority).options;
      if (!config?.queue) throw new Error('Missing queue configuration');
      await channel.assertQueue(config.queue, config.queueOptions);
    }
    await channel.close();
  } finally {
    await connection.close();
  }
}
