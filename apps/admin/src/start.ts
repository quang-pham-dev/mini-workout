import { withSecurityHeaders } from '@/lib/security';
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

const securityMiddleware = createMiddleware().server(async ({ next }) => {
  return withSecurityHeaders(next, setResponseHeader);
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware, csrfMiddleware],
}));
