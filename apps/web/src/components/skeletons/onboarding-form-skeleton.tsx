import styles from './skeleton.module.css';

export function OnboardingFormSkeleton() {
  return (
    <div aria-hidden>
      <div
        className={`${styles.shimmer} ${styles.titleLine}`}
        style={{ width: '55%' }}
      />
      <div
        className={`${styles.shimmer} ${styles.line}`}
        style={{ width: '75%' }}
      />
      {[0, 1, 2, 3, 4].map((row) => (
        <div className={`${styles.shimmer} ${styles.inputRow}`} key={row} />
      ))}
      <div className={`${styles.shimmer} ${styles.button}`} />
    </div>
  );
}
