import { prisma } from '@syntaxia/db';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runTests } from './lib/test-runner';

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
      // 1. Actualizar estado a RUNNING
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'RUNNING' },
      });
      console.log(`[Job ${job.id}] Estado actualizado a RUNNING`);

      // 2. Obtener contexto completo (submission + challenge + testCases + language)
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

      // 3. EJECUCIÓN REAL CON TEST RUNNER
      console.log(`[Job ${job.id}] Ejecutando Test Runner...`);

      const testResult = await runTests({ submission });

      console.log(`[Job ${job.id}] Resultado del Test Runner:`, {
        finalStatus: testResult.finalStatus,
        testsPassed: testResult.testsPassed,
        testsTotal: testResult.testsTotal,
        errorMessage: testResult.errorMessage,
        totalDuration: `${testResult.totalDuration}ms`,
      });

      // 4. Persistir el estado final determinado por el Test Runner
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: testResult.finalStatus },
      });

      console.log(
        `[Job ${job.id}] ✅ Ejecución completada. Estado final: ${testResult.finalStatus}`
      );
    } catch (error) {
      console.error(`[Job ${job.id}] ❌ Error procesando el job:`, error);

      // En caso de error catastrófico del worker, marcar como SYSTEM_ERROR
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'SYSTEM_ERROR' },
      });
      throw error;
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} falló:`, err.message);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️ Cerrando worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
