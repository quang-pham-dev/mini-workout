export type AuthEmailKind = 'verification' | 'password-reset';

export type AuthEmail = Readonly<{
  kind: AuthEmailKind;
  to: string;
  url: string;
}>;

export type AuthEmailEnvironment = Readonly<Record<string, string | undefined>>;

export class AuthEmailConfigurationError extends Error {
  constructor() {
    super('Authentication email delivery is not configured');
    this.name = 'AuthEmailConfigurationError';
  }
}

export class AuthEmailDeliveryError extends Error {
  constructor(cause?: unknown) {
    super('Authentication email delivery failed', { cause });
    this.name = 'AuthEmailDeliveryError';
  }
}

export type AuthEmailSender = (email: AuthEmail) => Promise<void>;

export function assertAuthEmailConfiguration(
  env: AuthEmailEnvironment = process.env,
) {
  if (!env.RESEND_API_KEY?.trim() || !env.AUTH_EMAIL_FROM?.trim()) {
    throw new AuthEmailConfigurationError();
  }
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  );

function getEmailContent(email: AuthEmail) {
  const url = escapeHtml(email.url);
  if (email.kind === 'verification') {
    return {
      subject: 'Verify your Mini Workout email',
      text: `Verify your Mini Workout email by opening this link: ${email.url}`,
      html: `<p>Verify your Mini Workout email to continue.</p><p><a href="${url}">Verify email</a></p>`,
    };
  }

  return {
    subject: 'Reset your Mini Workout password',
    text: `Reset your Mini Workout password by opening this link: ${email.url}`,
    html: `<p>We received a request to reset your Mini Workout password.</p><p><a href="${url}">Reset password</a></p>`,
  };
}

export function createAuthEmailSender(
  env: AuthEmailEnvironment = process.env,
): AuthEmailSender {
  return async (email) => {
    const apiKey = env.RESEND_API_KEY?.trim();
    const from = env.AUTH_EMAIL_FROM?.trim();
    assertAuthEmailConfiguration(env);

    const content = getEmailContent(email);
    try {
      const response = await fetch(
        env.RESEND_API_URL?.trim() || 'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [email.to],
            subject: content.subject,
            text: content.text,
            html: content.html,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!response.ok) throw new AuthEmailDeliveryError();
    } catch (error) {
      if (error instanceof AuthEmailDeliveryError) throw error;
      throw new AuthEmailDeliveryError(error);
    }
  };
}
