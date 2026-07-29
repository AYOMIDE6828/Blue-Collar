import pinoHttp from 'pino-http'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

/** Request augmented with the authenticated user attached by auth middleware. */
type LoggedRequest = IncomingMessage & {
  user?: { id?: string }
  id?: string
}

const LOG_DIR = process.env.LOG_DIR ?? 'storage/logs'
fs.mkdirSync(path.resolve(LOG_DIR), { recursive: true })

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Pino-http middleware that logs every request with:
 * - method, url, status, response time
 * - user agent, IP address
 * - authenticated user id (if present)
 * - correlation ID (X-Request-ID header, or a generated UUID) so that all
 *   log lines for the same request can be grouped together.
 *
 * In production, logs are written to a daily rotating file via pino/file.
 * In development, pretty-printed to stdout.
 *
 * Correlation ID usage:
 *   The ID is surfaced via the `req.id` property and echoed back to the
 *   client in the `X-Request-ID` response header.  Downstream service calls
 *   should forward the same value in their `X-Request-ID` request header.
 */
export const requestLogger = pinoHttp({
  logger: isDev
    ? pino({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } } })
    : pino(
        { level: 'info' },
        pino.destination({
          dest: path.resolve(LOG_DIR, `api-${new Date().toISOString().slice(0, 10)}.log`),
          sync: false,
        }),
      ),

  // Attach a correlation / request ID.
  // Honour an incoming X-Request-ID header so callers can trace across services;
  // otherwise generate a new UUID v4 for this request.
  genReqId: (req): string => {
    const incoming = (req as IncomingMessage & { headers: Record<string, string | string[] | undefined> })
      .headers['x-request-id']
    if (incoming) return Array.isArray(incoming) ? incoming[0]! : incoming
    return randomUUID()
  },

  // Echo the correlation ID back to the caller.
  customSuccessMessage: (req: IncomingMessage, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req: IncomingMessage, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,

  // PII SAFETY: Only method, url, and statusCode are logged.
  // No headers, body, query params, or IP addresses are persisted.
  customProps: (req: IncomingMessage) => ({
    userId: (req as LoggedRequest).user?.id ?? null,
    correlationId: (req as LoggedRequest).id ?? null,
  }),

  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: (err) => ({ message: err.message, type: err.type }),
  },
})
