import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';

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

function isDisposableE2EDatabase(env: AuthEmailEnvironment) {
  if (!env.DATABASE_URL || env.DATABASE_URL !== env.E2E_DATABASE_URL)
    return false;
  try {
    const url = new URL(env.DATABASE_URL);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      url.pathname === '/mini_workout_e2e' &&
      url.search === '' &&
      url.hash === ''
    );
  } catch {
    return false;
  }
}

function assertFakeAuthEmailConfiguration(env: AuthEmailEnvironment) {
  const captureFile = env.AUTH_EMAIL_CAPTURE_FILE?.trim();
  if (!captureFile || !isAbsolute(captureFile)) {
    throw new AuthEmailConfigurationError();
  }
  if (env.NODE_ENV === 'production' && !isDisposableE2EDatabase(env)) {
    throw new AuthEmailConfigurationError();
  }
}

export function assertAuthEmailConfiguration(
  env: AuthEmailEnvironment = process.env,
) {
  if (env.AUTH_EMAIL_PROVIDER?.trim() === 'fake') {
    assertFakeAuthEmailConfiguration(env);
    return;
  }
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

function createFakeAuthEmailSender(env: AuthEmailEnvironment): AuthEmailSender {
  assertFakeAuthEmailConfiguration(env);
  const captureFile = env.AUTH_EMAIL_CAPTURE_FILE!.trim();
  const resetCapture =
    env.AUTH_EMAIL_CAPTURE_RESET === '1'
      ? mkdir(dirname(captureFile), { recursive: true }).then(() =>
          writeFile(captureFile, '', 'utf8'),
        )
      : Promise.resolve();

  return async (email) => {
    await resetCapture;
    const content = getEmailContent(email);
    await mkdir(dirname(captureFile), { recursive: true });
    await appendFile(
      captureFile,
      `${JSON.stringify({
        ...email,
        ...content,
        createdAt: new Date().toISOString(),
      })}\n`,
      'utf8',
    );
  };
}

export function createAuthEmailSender(
  env: AuthEmailEnvironment = process.env,
): AuthEmailSender {
  const provider = env.AUTH_EMAIL_PROVIDER?.trim() || 'resend';
  if (provider === 'fake') return createFakeAuthEmailSender(env);
  if (provider !== 'resend') throw new AuthEmailConfigurationError();

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
