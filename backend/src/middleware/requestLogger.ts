import { randomUUID } from 'node:crypto';
import pino, { type DestinationStream, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from '../config';

// Request bodies are never logged, so meeting content, comments and passwords stay out of logs.
const REDACT = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
];

export function createLogger(stream?: DestinationStream, level: string = config.LOG_LEVEL): Logger {
  return pino({ level, redact: { paths: REDACT, censor: '[redacted]' } }, stream);
}

export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customProps: (req) => ({ userId: (req as { user?: { id: string } }).user?.id }),
    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url.split('?')[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
