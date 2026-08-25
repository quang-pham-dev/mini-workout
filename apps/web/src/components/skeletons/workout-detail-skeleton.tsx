import styles from './skeleton.module.css';

export function WorkoutDetailSkeleton() {
  return (
    <div aria-hidden>
      <div className={`${styles.shimmer} ${styles.media}`} />
      <div
        className={`${styles.shimmer} ${styles.line}`}
        style={{ width: '30%', marginTop: 24 }}
      />
      <div
        className={`${styles.shimmer} ${styles.titleLine}`}
        style={{ width: '70%' }}
      />
      <div
        className={`${styles.shimmer} ${styles.line}`}
        style={{ width: '95%' }}
      />
      <div
        className={`${styles.shimmer} ${styles.line}`}
        style={{ width: '85%' }}
      />
      <div className={`${styles.shimmer} ${styles.metaRow}`}>
        <div
          className={`${styles.shimmer} ${styles.line}`}
          style={{ width: 80 }}
        />
        <div
          className={`${styles.shimmer} ${styles.line}`}
          style={{ width: 60 }}
        />
        <div
          className={`${styles.shimmer} ${styles.line}`}
          style={{ width: 100 }}
        />
      </div>
    </div>
  );
}
