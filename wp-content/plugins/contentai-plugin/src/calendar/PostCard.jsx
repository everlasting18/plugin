import styles from './PostCard.module.css';

function getSeoScore(post) {
  const title = post.title?.rendered || post.title || '';
  const contentLen = (post.content?.rendered || post.content || '').length;
  let score = 0;
  if (title.length >= 20 && title.length <= 70) score += 30;
  else if (title.length > 0) score += 15;
  if (contentLen > 2000) score += 40;
  else if (contentLen > 500) score += 25;
  else if (contentLen > 100) score += 10;
  if (title.length > 0 && contentLen > 0) score += 20;
  score += Math.min(10, Math.floor(contentLen / 500));
  return Math.min(100, score);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function PostCard({ post, variant = 'sidebar', onDragStart }) {
  const title = post.title?.rendered || post.title || 'Không có tiêu đề';
  const seo = getSeoScore(post);
  // Get admin URL from current page path — works on localhost and production
  const getAdminUrl = () => {
    const path = window.location.pathname;
    // Extract the base path up to wp-admin (or admin.php page)
    const match = path.match(/^(\/[^/]+\/wp-admin\/)/);
    return match ? match[1] : '/wp-admin/';
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: post.id }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(post);
  };

  const handleClick = () => {
    window.location.href = `${getAdminUrl()}post.php?post=${post.id}&action=edit`;
  };

  if (variant === 'calendar') {
    return (
      <div
        className={styles.calendarCard}
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        title={title}
      >
        <span className={styles.dot} />
        <span className={styles.calendarTitle}>{title}</span>
      </div>
    );
  }

  return (
    <div
      className={styles.sidebarCard}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
    >
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardMeta}>
        <span className={styles.tag}>Nháp</span>
        <span className={styles.seo}>SEO {seo}</span>
        <span className={styles.date}>{formatDate(post.date)}</span>
      </div>
    </div>
  );
}
