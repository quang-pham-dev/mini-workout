import styles from './skeleton.module.css';

export function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading profile"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div
          className={styles.shimmer}
          style={{ width: '4.5rem', height: '4.5rem', borderRadius: '9999px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '14rem' }}>
          <div className={`${styles.shimmer} ${styles.titleLine}`} />
          <div className={`${styles.shimmer} ${styles.line}`} />
        </div>
      </div>

      <div
        className={styles.shimmer}
        style={{ height: '140px', borderRadius: '1.25rem', width: '100%' }}
      />
      <div
        className={styles.shimmer}
        style={{ height: '180px', borderRadius: '1.25rem', width: '100%' }}
      />
    </div>
  );
}
