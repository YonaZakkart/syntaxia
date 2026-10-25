import { prisma } from '@syntaxia/db';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

console.log('Worker iniciado y escuchando la cola "code-execution"...');

const worker = new Worker(
  'code-execution',
  async (job) => {
    const { submissionId } = job.data as { submissionId: string };
    console.log(`[Job ${job.id}] Procesando submission: ${submissionId}`);

    try {
      // Actualizar estado a RUNNING
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'RUNNING' },
      });
      console.log(`[Job ${job.id}] Estado actualizado a RUNNING`);

      // Obtener contexto completo
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          challenge: {
            include: {
              testCases: true,
            },
          },
          language: true,
        },
      });

      if (!submission) {
        throw new Error('Submission no encontrada');
      }

      console.log(
        `[Job ${job.id}] Contexto obtenido. Lenguaje: ${submission.language.name}, TestCases: ${submission.challenge.testCases.length}`
      );

      // SIMULACIÓN DE EJECUCIÓN (Aquí irá el Docker Sandbox)
      console.log(`[Job ${job.id}] Ejecutando código en sandbox (simulado)...`);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simular 1.5s de ejecución

      // Actualizar estado final (Mock: siempre ACCEPTED por ahora)
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'ACCEPTED' },
      });

      console.log(`[Job ${job.id}] Ejecución completada. Estado: ACCEPTED`);
    } catch (error) {
      console.error(`[Job ${job.id}] Error procesando el job:`, error);
      // En un caso real, aquí actualizaríamos a SYSTEM_ERROR o COMPILE_ERROR
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'SYSTEM_ERROR' },
      });
      throw error; // BullMQ reintentará o marcará como fallido
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} falló:`, err.message);
});

// Manejo graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹Cerrando worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
