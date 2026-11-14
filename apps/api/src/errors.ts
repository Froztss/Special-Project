import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ZodType } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 500,
    message: string,
  ) {
    super(message);
  }
}

/** Parse input with a zod schema or throw a 400 with the first issue. */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.');
    throw new HttpError(400, path ? `${path}: ${issue?.message}` : (issue?.message ?? 'Invalid input'));
  }
  return result.data;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

/** Uniform `{ "error": "message" }` responses (SRS §6.2). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const status = (err as { status?: number }).status;
  if (status === 400 || (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};