import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { positiveIdSchema, userRoleSchema } from '@starter/shared';
import { app } from '../../src/app.js';
import { errorHandler, HttpError } from '../../src/lib/errors.js';
import { parse, validateBody, validateQuery } from '../../src/lib/validate.js';
import { createTestApp } from '../../src/testing/testApp.js';

const { app: testApp, alice } = await createTestApp();

describe('1.5 validation', () => {
  it('parse returns typed data for valid input', () => {
    expect(parse(z.object({ n: z.number() }), { n: 5 })).toEqual({ n: 5 });
  });

  it('parse throws a 400 HttpError for invalid input', () => {
    try {
      parse(z.object({ n: z.number() }), { n: 'five' });
      expect.unreachable('parse should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      expect((err as HttpError).message).toBeTruthy();
    }
  });

  it('validateBody replaces req.body with parsed data', async () => {
    const probe = express();
    probe.use(express.json());
    probe.post('/echo', validateBody(z.object({ n: z.coerce.number() })), (req, res) => {
      res.json(req.body);
    });
    probe.use(errorHandler);
    const ok = await request(probe).post('/echo').send({ n: '5' });
    expect(ok.body).toEqual({ n: 5 });
    const bad = await request(probe).post('/echo').send({ n: 'five' });
    expect(bad.status).toBe(400);
  });

  it('validateQuery stores parsed query in res.locals', async () => {
    const probe = express();
    probe.get('/search', validateQuery(z.object({ q: z.string().min(1) })), (_req, res) => {
      res.json(res.locals.validatedQuery);
    });
    const res = await request(probe).get('/search').query({ q: 'hello' });
    expect(res.body).toEqual({ q: 'hello' });
  });

  it('shared schemas expose the SRS enums', () => {
    expect(userRoleSchema.options).toEqual(['caregiver', 'ot', 'sped_teacher']);
    expect(positiveIdSchema.parse('7')).toBe(7);
    expect(() => positiveIdSchema.parse('0')).toThrow();
  });

  it('routes reject invalid bodies with the uniform 400 shape', async () => {
    const res = await request(testApp)
      .post('/api/schedules')
      .set(alice)
      .send({ childId: 1, date: '2026-02-30' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('1.5 CORS', () => {
  it('allows the configured frontend origin', async () => {
    const res = await request(app)
      .options('/api/schedules')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not allow other origins', async () => {
    const res = await request(app)
      .options('/api/schedules')
      .set('Origin', 'http://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});