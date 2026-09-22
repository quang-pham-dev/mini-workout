import type {
  FeatureFlagContext,
  FeatureFlagReader,
} from '@mini-workout/feature-flags';
import type { BetterAuthOptions } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { createHmac } from 'node:crypto';

export type EmailVerificationPolicyInput = Readonly<{
  distinctId: string;
  properties?: FeatureFlagContext['properties'];
}>;

/** Resolve the policy at request time while keeping providers out of auth code. */
export async function isEmailVerificationRequired(
  reader: FeatureFlagReader,
  input: EmailVerificationPolicyInput,
): Promise<boolean> {
  return reader.isEnabled('auth.emailVerification', {
    distinctId: input.distinctId,
    properties: input.properties,
  });
}

const VERIFICATION_RESEND_PATH = '/send-verification-email';
const EMAIL_AUTH_PATHS = new Set([
  '/sign-up/email',
  '/sign-in/email',
  VERIFICATION_RESEND_PATH,
]);

function getEmailFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('email' in body)) return null;
  const email = body.email;
  return typeof email === 'string' && email.trim()
    ? email.trim().toLowerCase()
    : null;
}

function createRolloutIdentity(email: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(email).digest('hex');
  return `auth-rollout:${digest}`;
}

export function createEmailVerificationRequestHook({
  reader,
  identitySecret,
}: Readonly<{
  reader: FeatureFlagReader;
  identitySecret: string;
}>): NonNullable<BetterAuthOptions['hooks']>['before'] {
  return createAuthMiddleware(async (context) => {
    if (!context.path || !EMAIL_AUTH_PATHS.has(context.path)) return;

    const email = getEmailFromBody(context.body);
    if (!email) return;

    const enabled = await isEmailVerificationRequired(reader, {
      distinctId: createRolloutIdentity(email, identitySecret),
      properties: { authPath: context.path },
    });

    // Better Auth creates a shallow AuthContext copy for every dispatch. Replace
    // the options object on that request copy; never mutate the shared options.
    if (context.path === VERIFICATION_RESEND_PATH) {
      if (!enabled) return { status: true };
      return;
    }

    context.context.options = {
      ...context.context.options,
      emailAndPassword: {
        ...context.context.options.emailAndPassword,
        enabled: context.context.options.emailAndPassword?.enabled ?? true,
        autoSignIn: !enabled,
        requireEmailVerification: enabled,
      },
      emailVerification: {
        ...context.context.options.emailVerification,
        sendOnSignUp: enabled,
        autoSignInAfterVerification: true,
      },
    };
  });
}
