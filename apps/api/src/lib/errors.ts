import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Application error carrying an HTTP status and a stable machine code. */
export class HttpError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what = 'Resource') =>
  new HttpError(404, 'not_found', `${what} not found`);

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Unauthorized') =>
  new HttpError(401, 'unauthorized', message);

export const payloadTooLarge = (message: string) =>
  new HttpError(413, 'payload_too_large', message);

export const unprocessable = (message: string, details?: unknown) =>
  new HttpError(422, 'unprocessable', message, details);
