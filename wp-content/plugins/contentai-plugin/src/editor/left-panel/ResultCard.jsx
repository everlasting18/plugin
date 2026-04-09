import styles from './ResultCard.module.css';

export default function ResultCard({ result, onInsert, onDiscard, loading }) {
  // Strip H1 from preview since WordPress already sets the post title separately
  const contentNoH1 = result.content.replace(/<h1[^>]*>[\s\S]*?<\/h1>\s*/gi, '').trim();
  const plainText = contentNoH1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const preview = plainText.length > 120 ? plainText.slice(0, 120) + '...' : plainText;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content).catch(() => {});
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.badge}>{result.label} — vừa tạo</span>
        <button className={styles.copyBtn} onClick={handleCopy}>Copy</button>
      </div>

      <div className={styles.preview}>{preview}</div>

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onDiscard} disabled={loading}>
          Thử lại
        </button>
        <button className={styles.actionBtn} disabled={loading}>
          Ngắn hơn
        </button>
        <button className={styles.insertBtn} onClick={onInsert} disabled={loading}>
          &rarr; Chèn
        </button>
      </div>
    </div>
  );
}
