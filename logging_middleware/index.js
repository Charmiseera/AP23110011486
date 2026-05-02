import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export const asyncLocalStorage = new AsyncLocalStorage();

const LOG_URL = 'http://20.207.122.201/evaluation-service/logs';

export function Log(stack = 'backend', level, pkg, message) {
  const validStacks = ['backend', 'frontend'];
  const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
  const validPackages = ['handler', 'controller', 'service', 'repository', 'route', 'db', 'cache', 'cron_job', 'domain'];

  if (!validStacks.includes(stack)) {
    stack = 'backend';
  }

  if (!validLevels.includes(level)) {
    level = 'info';
  }

  if (!validPackages.includes(pkg)) {
    pkg = 'handler';
  }

  const logBody = {
    stack,
    level,
    package: pkg,
    message
  };

  if (!process.env.TOKEN) {
    return;
  }

  fetch(LOG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TOKEN}`
    },
    body: JSON.stringify(logBody)
  }).catch(() => {
    // Fail silently so logging failures don't crash the main app
  });
}

export function loggingMiddleware(req, res, next) {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  asyncLocalStorage.run({ requestId }, () => {
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'error' : 'info';

      Log(
        'backend',
        level,
        'route',
        `${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`
      );
    });
    next();
  });
}
