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
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'RUNNING' },
      });
      console.log(`[Job ${job.id}] Estado actualizado a RUNNING`);

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

      console.log(`[Job ${job.id}] Ejecutando código en Docker sandbox...`);
      const result = await executeInSandbox(
        submission.code,
        submission.language.name,
        submission.language.dockerImage
      );

      console.log(`[Job ${job.id}] Resultado del sandbox:`, {
        exitCode: result.exitCode,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
        duration: result.duration,
      });

      // Determinar estado final
      // El comando `timeout` de Linux devuelve exitCode 124 cuando hay timeout
      let finalStatus:
        | 'PASSED'
        | 'WRONG_ANSWER'
        | 'TIME_LIMIT_EXCEEDED'
        | 'RUNTIME_ERROR'
        | 'SYSTEM_ERROR';

      if (result.exitCode === 124) {
        finalStatus = 'TIME_LIMIT_EXCEEDED';
      } else if (result.exitCode !== 0) {
        finalStatus = 'RUNTIME_ERROR';
      } else {
        // Por ahora, si no hay error, marcamos como PASSED
        // En el Paso 9.3 compararemos con test cases
        finalStatus = 'PASSED';
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
