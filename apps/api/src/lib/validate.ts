import { z } from 'zod';
import type { RequestHandler } from 'express';
import { HttpError } from './errors.js';

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request');
  }
  return result.data;
}

export function validateBody<S extends z.ZodType>(schema: S): RequestHandler {
  return (req, _res, next) => {
    req.body = parse(schema, req.body);
    next();
  };
}

export function validateQuery<S extends z.ZodType>(schema: S): RequestHandler {
  return (req, res, next) => {
    res.locals.validatedQuery = parse(schema, req.query);
    next();
  };
}