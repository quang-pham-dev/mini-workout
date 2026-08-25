import styles from './skeleton.module.css';

type HomeFeedSkeletonProps = {
  count: number;
};

export function HomeFeedSkeleton({ count }: HomeFeedSkeletonProps) {
  return (
    <div aria-hidden className={styles.cardGrid}>
      {Array.from({ length: count }, (_, index) => (
        <div className={styles.card} key={index}>
          <div className={`${styles.shimmer} ${styles.thumbnail}`} />
          <div
            className={`${styles.shimmer} ${styles.titleLine}`}
            style={{ width: '60%' }}
          />
          <div
            className={`${styles.shimmer} ${styles.line}`}
            style={{ width: '90%' }}
          />
          <div
            className={`${styles.shimmer} ${styles.line}`}
            style={{ width: '40%' }}
          />
        </div>
      ))}
    </div>
  );
}
