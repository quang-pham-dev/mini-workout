import styles from '../auth.module.css';
import { loginAction } from './actions';
import Link from 'next/link';

type LoginContentProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function LoginContent({ searchParams }: LoginContentProps) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === 'string' ? params.callbackUrl : '/home';
  const hasRegistrationSuccess = params.registered === '1';

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="login-title">
        <h1 className={styles.title} id="login-title">
          Welcome back
        </h1>
        <p className={styles.subtitle}>
          Sign in to continue your workout journey.
        </p>
        {hasRegistrationSuccess ? (
          <p role="status">Your account is ready. Please sign in.</p>
        ) : null}
        {typeof params.error === 'string' ? (
          <p className={styles.error} role="alert">
            Invalid email or password.
          </p>
        ) : null}
        <form action={loginAction} className={styles.form}>
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
          <button className={styles.submit} type="submit">
            Sign in
          </button>
        </form>
        <p className={styles.footer}>
          New to Mini Workout? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
