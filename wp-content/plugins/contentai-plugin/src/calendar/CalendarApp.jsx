import { useState, useEffect, useCallback } from 'react';
import styles from './CalendarApp.module.css';
import Sidebar from './Sidebar.jsx';
import CalendarGrid from './CalendarGrid.jsx';
import ScheduleModal from './ScheduleModal.jsx';

const restUrl = () => window.contentaiData?.restUrl || '/wp-json/';
const nonce = () => window.contentaiData?.nonce || '';

async function wpFetch(endpoint, options = {}) {
  const res = await fetch(`${restUrl()}${endpoint}`, {
    headers: { 'X-WP-Nonce': nonce(), 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`WP API error: ${res.status}`);
  return res.json();
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
      const data = await wpFetch('wp/v2/categories?per_page=100&hide_empty=false');
      setCategories(data.filter((c) => c.id !== 1)); // exclude "Uncategorized"
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    try {
      const data = await wpFetch('wp/v2/posts?status=draft&per_page=50&orderby=date&order=desc');
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
        `wp/v2/posts?status=future,publish&per_page=100&after=${start}&before=${end}&orderby=date&order=asc`
      );
      // Enrich with category names
      const catMap = {};
      categories.forEach((c) => { catMap[c.id] = c.name; });
      data.forEach((p) => {
        p._categoryNames = (p.categories || []).map((id) => catMap[id]).filter(Boolean);
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
    const post = drafts.find((d) => d.id === postId) || posts.find((p) => p.id === postId);
    const postTitle = post?.title?.rendered || 'Bài viết';
    setScheduleModal({ postId, postTitle, targetDate });
  };

  // Confirm scheduling with selected time
  const handleScheduleConfirm = async (scheduledDate) => {
    if (!scheduleModal) return;
    setScheduleModal(null);
    try {
      await wpFetch(`wp/v2/posts/${scheduleModal.postId}`, {
        method: 'POST',
        body: JSON.stringify({
          date: scheduledDate.toISOString(),
          status: 'future',
        }),
      });
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
