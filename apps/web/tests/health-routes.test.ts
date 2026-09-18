import { GET as getLive } from '@/app/api/health/live/route';
import { GET as getReady } from '@/app/api/health/ready/route';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pingDatabase } = vi.hoisted(() => ({
  pingDatabase: vi.fn<() => Promise<void>>(),
}));

vi.mock('@mini-workout/database', () => ({ pingDatabase }));

describe('health routes', () => {
  beforeEach(() => {
    pingDatabase.mockReset();
    pingDatabase.mockResolvedValue(undefined);
  });

  it('keeps liveness independent from the database', async () => {
    const response = await getLive();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.checks).toEqual([
      expect.objectContaining({ name: 'application', status: 'healthy' }),
    ]);
    expect(pingDatabase).not.toHaveBeenCalled();
  });

  it('checks the database for readiness and returns a request id', async () => {
    const response = await getReady(
      new Request('http://localhost/api/health/ready', {
        headers: { 'x-request-id': 'request-1' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.requestId).toBe('request-1');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe('request-1');
    expect(pingDatabase).toHaveBeenCalledOnce();
  });

  it('returns 503 when the database is not ready', async () => {
    pingDatabase.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await getReady(
      new Request('http://localhost/api/health/ready'),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.checks).toEqual([
      expect.objectContaining({
        name: 'database',
        status: 'unhealthy',
        message: 'database unavailable',
      }),
    ]);
  });
});
