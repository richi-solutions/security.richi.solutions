import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireApiKey } from '../middleware/auth';
import { Scheduler } from '../scheduler/scheduler';

// Safety cap so the HTTP request doesn't hang forever
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

export function createTriggerRouter(scheduler: Scheduler): Router {
  const router = Router();

  router.post('/api/trigger/:jobName', requireApiKey, async (req: Request, res: Response) => {
    const { jobName } = req.params;

    const trigger = scheduler.triggerManually(jobName);

    if (!trigger) {
      res.status(404).json({
        ok: false,
        error: { code: 'JOB_NOT_FOUND', message: `Job "${jobName}" not found.` },
        traceId: uuidv4(),
      });
      return;
    }

    const timeoutMs = Math.min(trigger.jobDef.timeout_ms ?? MAX_WAIT_MS, MAX_WAIT_MS);

    try {
      const result = await Promise.race([
        trigger.promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Job execution timed out')), timeoutMs),
        ),
      ]);

      const httpStatus = result.status === 'failure' ? 502 : 200;
      res.status(httpStatus).json({
        ok: result.status !== 'failure',
        data: { jobName, status: result.status, error: result.error },
      });
    } catch (err) {
      res.status(504).json({
        ok: false,
        error: {
          code: 'JOB_TIMEOUT',
          message: err instanceof Error ? err.message : 'Job execution timed out',
        },
        traceId: uuidv4(),
      });
    }
  });

  router.get('/api/jobs', requireApiKey, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: { jobs: scheduler.getJobNames() },
    });
  });

  return router;
}
