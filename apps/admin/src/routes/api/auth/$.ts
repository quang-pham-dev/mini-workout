import { forwardAuthRequest } from '@/lib/auth-handler';
import { tanstackAuth } from '@mini-workout/auth/tanstack-start';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => forwardAuthRequest(request, tanstackAuth.handler),
      POST: ({ request }) => forwardAuthRequest(request, tanstackAuth.handler),
    },
  },
});
