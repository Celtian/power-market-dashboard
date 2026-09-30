import { queueOptions } from './queue';

describe('RabbitMQ acknowledgement configuration', () => {
  it('uses manual ACK for workers and automatic ACK for publisher direct-reply consumers', () => {
    process.env.RABBITMQ_URL = 'amqp://localhost';
    expect(queueOptions('live').options?.noAck).toBe(false);
    expect(queueOptions('live', false).options?.noAck).toBe(true);
    expect(queueOptions('live', false).options?.persistent).toBe(true);
  });
});
