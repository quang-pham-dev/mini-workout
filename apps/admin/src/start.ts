import { securityHeaders } from '@/lib/security';
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

const securityMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  for (const [name, value] of Object.entries(securityHeaders)) {
    setResponseHeader(name, value);
  }
  return result;
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware, csrfMiddleware],
}));
