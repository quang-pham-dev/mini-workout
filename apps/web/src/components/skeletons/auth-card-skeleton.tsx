import styles from './skeleton.module.css';

export function AuthCardSkeleton() {
  return (
    <div aria-hidden>
      <div
        className={`${styles.shimmer} ${styles.titleLine}`}
        style={{ width: '45%' }}
      />
      <div
        className={`${styles.shimmer} ${styles.line}`}
        style={{ width: '70%' }}
      />
      {[0, 1].map((row) => (
        <div className={`${styles.shimmer} ${styles.inputRow}`} key={row} />
      ))}
      <div className={`${styles.shimmer} ${styles.button}`} />
    </div>
  );
}
