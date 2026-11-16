import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ requires maxRetriesPerRequest: null on the ioredis connection.
const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

connection.on('error', (error) => {
  console.error('[queue] Redis connection error:', error.message);
});

export const executionQueue = new Queue('code-execution', {
  connection,
  defaultJobOptions: {
    // Keep Redis from growing forever with processed jobs.
    removeOnComplete: { age: 60 * 60, count: 1000 },
    removeOnFail: { age: 24 * 60 * 60 },
  },
});
