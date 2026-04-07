import styles from './KeywordInput.module.css';

export default function KeywordInput({ value, onChange, disabled }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>KEYWORD / TIÊU ĐỀ</label>
      <textarea
        className={styles.textarea}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="VD: 10 chiến lược viết content chuẩn SEO 2026"
        disabled={disabled}
      />
    </div>
  );
}
