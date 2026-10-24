import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ requiere maxRetriesPerRequest: null en la conexión de ioredis
const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

export const executionQueue = new Queue('code-execution', { connection });
