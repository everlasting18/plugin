import styles from './UsageBanner.module.css';

export default function UsageBanner({ used, limit }) {
  const remaining = limit - used;
  const isOut = remaining <= 0;

  return (
    <div className={`${styles.banner} ${isOut ? styles.danger : styles.warning}`}>
      <div className={styles.text}>
        {isOut
          ? `Bạn đã dùng hết ${limit} bài miễn phí tháng này.`
          : `Còn ${remaining} bài miễn phí tháng này.`}
      </div>
      <a
        href="https://contentai.vn/pro"
        target="_blank"
        rel="noreferrer"
        className={styles.link}
      >
        Nâng cấp Pro
      </a>
    </div>
  );
}
