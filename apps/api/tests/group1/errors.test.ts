import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { asyncHandler, errorHandler, HttpError } from '../../src/lib/errors.js';

function appThrowing(error: unknown) {
  const probe = express();
  probe.get(
    '/boom',
    asyncHandler(async () => {
      throw error;
    }),
  );
  probe.use(errorHandler);
  return probe;
}

describe('1.4 uniform error handling', () => {
  it('returns HttpError status and message in the uniform shape', async () => {
    const res = await request(appThrowing(new HttpError(404, 'Child not found'))).get('/boom');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Child not found' });
  });

  it('forwards async rejections to the error middleware', async () => {
    const res = await request(appThrowing(new HttpError(409, 'Conflict'))).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Conflict' });
  });

  it('hides unexpected errors behind a 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThrowing(new Error('secret internals'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    spy.mockRestore();
  });

  it('keeps the JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('rejects malformed JSON bodies with 400', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', 'Bearer 1')
      .set('Content-Type', 'application/json')
      .send('{"childId":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid JSON body' });
  });

  it('rejects oversized bodies with 400', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', 'Bearer 1')
      .send({ childId: 1, date: '2026-11-14', padding: 'x'.repeat(150_000) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});