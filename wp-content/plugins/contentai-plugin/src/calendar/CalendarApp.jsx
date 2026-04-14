import { useState, useEffect, useCallback } from 'react';
import styles from './CalendarApp.module.css';
import Sidebar from './Sidebar.jsx';
import CalendarGrid from './CalendarGrid.jsx';
import ScheduleModal from './ScheduleModal.jsx';

const nonce = () => window.contentaiData?.nonce || '';
const adminUrl = () => window.contentaiData?.adminUrl || '';

// Try REST with ?rest_route= prefix, fall back to admin-ajax.php
async function wpFetch(endpoint, options = {}) {
  const restUrl = '/?rest_route=';
  const n = nonce();

  // Separate path from query string in endpoint
  const qIdx = endpoint.indexOf('?');
  const path = qIdx >= 0 ? endpoint.substring(0, qIdx) : endpoint;
  const rawParams = qIdx >= 0 ? endpoint.substring(qIdx + 1) : '';
  // Parse raw params into key-value pairs
  const queryObj = {};
  if (rawParams) {
    rawParams.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) queryObj[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }

  // 1. Try REST
  try {
    const res = await fetch(`${restUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers: { 'X-WP-Nonce': n, 'Content-Type': 'application/json', ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    if (!res.ok) throw new Error(`REST ${res.status}`);
  } catch (err) {}

  // 2. Fallback: admin-ajax.php — pass path + params as separate fields
  const params = new URLSearchParams({ _wpnonce: n, _path: path });
  Object.entries(queryObj).forEach(([k, v]) => params.append(k, v));
  const ajaxUrl = `${adminUrl()}admin-ajax.php?action=contentai_api&${params}`;
  console.log('[wpFetch] AJAX URL:', ajaxUrl);
  const res2 = await fetch(ajaxUrl, { method: 'GET', headers: { 'X-WP-Nonce': n } });
  const text2 = await res2.text();
  console.log('[wpFetch] AJAX response status:', res2.status, 'text preview:', text2.substring(0, 200));
  if (!res2.ok) throw new Error(`AJAX error: ${res2.status}`);
  return JSON.parse(text2);
}

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [drafts, setDrafts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState(null); // { postId, postTitle, targetDate }

  const fetchCategories = useCallback(async () => {
    try {
      const data = await wpFetch('contentai/v1/categories');
      setCategories(data.filter((c) => c.id !== 1)); // exclude "Uncategorized"
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    try {
      const data = await wpFetch('contentai/v1/posts?status=draft');
      setDrafts(data);
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    }
  }, []);

  const fetchCalendarPosts = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    try {
      const data = await wpFetch(
        `contentai/v1/posts?status=future&after=${start}&before=${end}`
      );
      // Enrich with category names
      const catMap = {};
      categories.forEach((c) => { catMap[c.id] = c.name; });
      data.forEach((p) => {
        p._categoryNames = (p.categories || []).map((cat) => cat.name || '').filter(Boolean);
      });
      setPosts(data);
    } catch (err) {
      console.error('Failed to fetch calendar posts:', err);
    }
  }, [currentDate, categories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDrafts(), fetchCalendarPosts()]).finally(() => setLoading(false));
  }, [fetchDrafts, fetchCalendarPosts]);

  // When a post is dropped on a date, show the schedule modal
  const handleDropPost = (postId, targetDate) => {
    console.log('[Calendar] handleDropPost', postId, targetDate);
    const post = drafts.find((d) => d.id === postId) || posts.find((p) => p.id === postId);
    console.log('[Calendar] found post:', post?.title);
    const postTitle = post?.title?.rendered || post?.title || 'Bài viết';
    setScheduleModal({ postId, postTitle, targetDate });
  };

  // Confirm scheduling with selected time
  const handleScheduleConfirm = async (scheduledDate) => {
    if (!scheduleModal) return;
    setScheduleModal(null);

    // Schedule via AJAX (POST with data)
    const ajaxUrl = `${adminUrl()}admin-ajax.php?action=contentai_schedule`;
    const formData = new FormData();
    const n = nonce();
    formData.append('post_id', scheduleModal.postId);
    formData.append('date_gmt', scheduledDate.toISOString());
    formData.append('_wpnonce', n);

    try {
      const res = await fetch(ajaxUrl, {
        method: 'POST',
        headers: { 'X-WP-Nonce': n },
        body: formData,
      });
      if (!res.ok) throw new Error('Schedule failed');
      await Promise.all([fetchDrafts(), fetchCalendarPosts()]);
    } catch (err) {
      console.error('Failed to schedule post:', err);
      alert('Không thể lên lịch bài viết. Vui lòng thử lại.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <Sidebar drafts={drafts} />
        <CalendarGrid
          currentDate={currentDate}
          posts={posts}
          categories={categories}
          view={view}
          filterStatus={filterStatus}
          filterCategory={filterCategory}
          onChangeDate={setCurrentDate}
          onChangeView={setView}
          onDropPost={handleDropPost}
          onFilterStatus={setFilterStatus}
          onFilterCategory={setFilterCategory}
        />
      </div>
      {loading && (
        <div className={styles.loadingBar}>
          <div className={styles.loadingProgress} />
        </div>
      )}
      {scheduleModal && (
        <ScheduleModal
          postTitle={scheduleModal.postTitle}
          targetDate={scheduleModal.targetDate}
          onConfirm={handleScheduleConfirm}
          onCancel={() => setScheduleModal(null)}
        />
      )}
    </div>
  );
}
