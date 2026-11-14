import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ZodType } from 'zod';

export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

export class HttpError extends Error {
  constructor(
    readonly status: ApiErrorStatus,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

export function parseOr400<T>(
  schema: ZodType<T>,
  input: unknown,
  location: 'body' | 'query',
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, `Invalid request ${location}`);
  }
  return result.data;
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    req.body = parseOr400(schema, req.body, 'body');
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    res.locals.validatedQuery = parseOr400(schema, req.query, 'query');
    next();
  };
}

function isJsonParseError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && error.type === 'entity.parse.failed';
}

function isBodyTooLargeError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && error.type === 'entity.too.large';
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (isJsonParseError(error)) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  if (isBodyTooLargeError(error)) {
    res.status(400).json({ error: 'Request body too large' });
    return;
  }

  console.error('Unhandled API error:', error);
  res.status(500).json({ error: 'Internal server error' });
};
