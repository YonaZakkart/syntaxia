import { prisma } from '@syntaxia/db';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { executeInSandbox } from './lib/docker-sandbox';

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

      // 2. Obtener contexto completo
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

      // 3. EJECUCIÓN REAL EN DOCKER SANDBOX
      console.log(`[Job ${job.id}] Ejecutando código en Docker sandbox...`);
      const result = await executeInSandbox(
        submission.code,
        submission.language.name
      );

      console.log(`[Job ${job.id}] Resultado del sandbox:`, {
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
      });

      // 4. Determinar estado final (lógica básica por ahora, se refinará en Paso 9)
      let finalStatus: string;
      if (result.timedOut) {
        finalStatus = 'TIME_LIMIT_EXCEEDED';
      } else if (result.exitCode !== 0) {
        finalStatus = 'RUNTIME_ERROR';
      } else {
        finalStatus = 'ACCEPTED'; // Por ahora; en el Paso 9 compararemos con test cases
      }

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: finalStatus },
      });

      console.log(
        `[Job ${job.id}] ✅ Ejecución completada. Estado: ${finalStatus}`
      );
    } catch (error) {
      console.error(`[Job ${job.id}] ❌ Error procesando el job:`, error);
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
