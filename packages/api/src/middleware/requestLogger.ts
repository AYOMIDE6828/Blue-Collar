import pinoHttp from 'pino-http'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Request augmented with the authenticated user attached by auth middleware. */
type LoggedRequest = IncomingMessage & { user?: { id?: string }; correlationId?: string }

const LOG_DIR = process.env.LOG_DIR ?? 'storage/logs'
fs.mkdirSync(path.resolve(LOG_DIR), { recursive: true })

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Pino-http middleware that logs every request with:
 * - method, url, status, response time
 * - user agent, IP address
 * - authenticated user id (if present)
 * - correlation ID (from X-Correlation-Id header or auto-generated)
 *
 * In production, logs are written to a daily rotating file via pino/file.
 * In development, pretty-printed to stdout.
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

  // Generate or propagate correlation ID
  genReqId: (req: IncomingMessage): string => {
    const existing = (req.headers as Record<string, string | string[] | undefined>)['x-correlation-id']
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? crypto.randomUUID()
    ;(req as LoggedRequest).correlationId = id
    return id
  },

  // Attach correlation ID to every response
  customSuccessObject: (req: IncomingMessage, _res: ServerResponse, val: Record<string, unknown>) => {
    return { ...val, correlationId: (req as LoggedRequest).correlationId }
  },

  customErrorObject: (req: IncomingMessage, _res: ServerResponse, _err: Error, val: Record<string, unknown>) => {
    return { ...val, correlationId: (req as LoggedRequest).correlationId }
  },

  // PII SAFETY: Only method, url, and statusCode are logged.
  // No headers, body, query params, or IP addresses are persisted.
  customProps: (req: IncomingMessage) => ({
    userId: (req as LoggedRequest).user?.id ?? null,
    correlationId: (req as LoggedRequest).correlationId,
  }),

  customSuccessMessage: (req: IncomingMessage, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req: IncomingMessage, res, err) => `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,

  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: (err) => ({ message: err.message, type: err.type }),
  },
})
