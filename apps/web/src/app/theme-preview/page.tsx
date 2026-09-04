import styles from './theme-preview.module.css';
import { ThemeToggle } from '@/components/theme/theme';

export default function ThemePreviewPage() {
  return (
    <main className={styles.page}>
      <button type="button">Previous control</button>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Theme preview</p>
        <h1>Choose your workout atmosphere.</h1>
        <p>
          Preview the theme controls without requiring an account or database.
        </p>
        <ThemeToggle />
      </section>
      <button type="button">Next control</button>
    </main>
  );
}
