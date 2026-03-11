import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scheduler } from './scheduler';

describe('Scheduler', () => {
  const mockTrigger = vi.fn().mockResolvedValue({ status: 'success' });
  let scheduler: Scheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduler = new Scheduler(
      {
        jobs: {
          'job-a': { cron: '0 2 * * *', type: 'sweep', targets: 'all', timeout_ms: 120_000 },
          'job-b': { cron: '0 3 * * *', type: 'aggregate', targets: 'all', timeout_ms: 120_000 },
        },
      },
      mockTrigger,
    );
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('returns all job names', () => {
    expect(scheduler.getJobNames()).toEqual(['job-a', 'job-b']);
  });

  it('triggers manually for existing job', () => {
    const result = scheduler.triggerManually('job-a');
    expect(result).not.toBeNull();
    expect(result!.promise).toBeInstanceOf(Promise);
    expect(mockTrigger).toHaveBeenCalledWith('job-a', expect.objectContaining({ type: 'sweep' }));
  });

  it('returns null for non-existent job', () => {
    const result = scheduler.triggerManually('non-existent');
    expect(result).toBeNull();
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('schedules jobs on start without errors', () => {
    expect(() => scheduler.start()).not.toThrow();
  });

  it('stops cleanly', () => {
    scheduler.start();
    expect(() => scheduler.stop()).not.toThrow();
  });
});
