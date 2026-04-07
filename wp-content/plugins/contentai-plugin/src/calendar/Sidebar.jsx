import styles from './Sidebar.module.css';
import PostCard from './PostCard.jsx';

export default function Sidebar({ drafts, onDragStart }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
        </svg>
        <span className={styles.headerText}>Bài chưa lên lịch</span>
        <span className={styles.badge}>{drafts.length} bài</span>
      </div>

      <p className={styles.hint}>Kéo bài vào calendar để lên lịch →</p>

      <div className={styles.list}>
        {drafts.length === 0 && (
          <div className={styles.empty}>Không có bài nháp nào.</div>
        )}
        {drafts.map((post) => (
          <PostCard key={post.id} post={post} variant="sidebar" onDragStart={onDragStart} />
        ))}
      </div>

      <div className={styles.footer}>
        + Kéo thả bài vào ngày muốn đăng
      </div>
    </div>
  );
}
