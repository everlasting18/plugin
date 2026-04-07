import { useState } from 'react';
import styles from './AdminApp.module.css';
import PromptInput from './PromptInput.jsx';
import { api } from '../lib/api.js';

export default function AdminApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async ({ prompt, length, audience, framework, webSearch }) => {
    setLoading(true); setError(''); setStatus('Đang tạo nội dung...');
    try {
      const data = await api.generate({ keyword: prompt, tone: 'professional', length, audience, framework, webSearch, action: 'full_article' });
      setStatus('Đang tạo bài viết nháp...');
      const res = await fetch(`${window.contentaiData.restUrl}wp/v2/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.contentaiData.nonce },
        body: JSON.stringify({ title: data.title || prompt, content: data.content, status: 'draft' }),
      });
      if (!res.ok) throw new Error('Không thể tạo bài viết nháp');
      const post = await res.json();
      setStatus('Đang chuyển đến editor...');
      window.location.href = `${window.contentaiData.adminUrl}post.php?post=${post.id}&action=edit`;
    } catch (err) { setError(err.message || 'Có lỗi xảy ra.'); setStatus(''); }
    finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>C</div>
          <span className={styles.logoText}>ContentAI</span>
        </div>
        <h1 className={styles.heading}>
          Write <span className={styles.headingGrad}>high-performing</span> content
        </h1>
        <p className={styles.sub}>instantly</p>
        <PromptInput onSubmit={handleSubmit} loading={loading} />
        {status && <div className={styles.status}><span className={styles.statusDot}/>{status}</div>}
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
