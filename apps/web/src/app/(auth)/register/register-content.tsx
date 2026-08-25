import styles from '../auth.module.css';
import { registerAction } from './actions';
import Link from 'next/link';

type RegisterContentProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function RegisterContent({ searchParams }: RegisterContentProps) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === 'string' ? params.callbackUrl : '/home';

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="register-title">
        <h1 className={styles.title} id="register-title">
          Create your account
        </h1>
        <p className={styles.subtitle}>
          Start building a consistent workout habit.
        </p>
        {typeof params.error === 'string' ? (
          <p className={styles.error} role="alert">
            Unable to create your account. Check your details and try again.
          </p>
        ) : null}
        <form action={registerAction} className={styles.form}>
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <div className={styles.field}>
            <label htmlFor="name">Name</label>
            <input
              autoComplete="name"
              id="name"
              name="name"
              required
              type="text"
            />
          </div>
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
              autoComplete="new-password"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              autoComplete="new-password"
              id="confirmPassword"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </div>
          <button className={styles.submit} type="submit">
            Create account
          </button>
        </form>
        <p className={styles.footer}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
