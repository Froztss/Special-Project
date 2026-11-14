import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

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

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };

function hasErrorType(error: unknown, type: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && error.type === type;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if ((err instanceof SyntaxError && 'body' in err) || hasErrorType(err, 'entity.parse.failed')) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  if (hasErrorType(err, 'entity.too.large')) {
    res.status(400).json({ error: 'Request body too large' });
    return;
  }

  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'Internal server error' });
};