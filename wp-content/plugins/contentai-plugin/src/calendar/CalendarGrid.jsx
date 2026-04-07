import { useState } from 'react';
import styles from './CalendarGrid.module.css';
import PostCard from './PostCard.jsx';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'future', label: 'Lên lịch' },
  { value: 'publish', label: 'Đã đăng' },
];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days = [];
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ day: prevLast - i, month: month - 1, isOther: true });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, month, isOther: false });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, month: month + 1, isOther: true });
    }
  }
  return days;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function CalendarGrid({
  currentDate, posts, view, categories,
  filterStatus, filterCategory,
  onChangeDate, onChangeView, onDropPost, onDragStart,
  onFilterStatus, onFilterCategory,
}) {
  const [dragOverCell, setDragOverCell] = useState(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const calDays = getCalendarDays(year, month);

  // Apply filters
  const filtered = posts.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterCategory && filterCategory !== 'all') {
      if (!p.categories?.includes(Number(filterCategory))) return false;
    }
    return true;
  });

  const scheduledCount = filtered.length;

  const prev = () => onChangeDate(new Date(year, month - 1, 1));
  const next = () => onChangeDate(new Date(year, month + 1, 1));

  const getPostsForDay = (day, mon) => {
    const actualYear = mon < 0 ? year - 1 : mon > 11 ? year + 1 : year;
    const actualMonth = ((mon % 12) + 12) % 12;
    return filtered.filter((p) => {
      const pd = new Date(p.date);
      return pd.getFullYear() === actualYear && pd.getMonth() === actualMonth && pd.getDate() === day;
    });
  };

  const handleDragOver = (e, cellKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(cellKey);
  };

  const handleDragLeave = () => setDragOverCell(null);

  const handleDrop = (e, day, mon) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const actualYear = mon < 0 ? year - 1 : mon > 11 ? year + 1 : year;
      const actualMonth = ((mon % 12) + 12) % 12;
      const targetDate = new Date(actualYear, actualMonth, day);
      onDropPost?.(data.id, targetDate);
    } catch {}
  };

  if (view === 'list') {
    return (
      <div className={styles.container}>
        <Header
          month={month} year={year} scheduledCount={scheduledCount}
          view={view} onChangeView={onChangeView} onPrev={prev} onNext={next}
          categories={categories}
          filterStatus={filterStatus} filterCategory={filterCategory}
          onFilterStatus={onFilterStatus} onFilterCategory={onFilterCategory}
        />
        <div className={styles.listView}>
          {filtered.length === 0 && <div className={styles.emptyList}>Chưa có bài nào được lên lịch tháng này.</div>}
          {filtered
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((p) => (
              <div key={p.id} className={styles.listItem}>
                <span className={styles.listDate}>{new Date(p.date).toLocaleDateString('vi-VN')}</span>
                <span className={styles.listTime}>
                  {new Date(p.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={styles.listStatus} data-status={p.status}>{p.status === 'publish' ? 'Đã đăng' : 'Lên lịch'}</span>
                <span className={styles.listTitle} dangerouslySetInnerHTML={{ __html: p.title?.rendered }} />
                <span className={styles.listCategory}>
                  {p._categoryNames?.join(', ') || ''}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header
        month={month} year={year} scheduledCount={scheduledCount}
        view={view} onChangeView={onChangeView} onPrev={prev} onNext={next}
        categories={categories}
        filterStatus={filterStatus} filterCategory={filterCategory}
        onFilterStatus={onFilterStatus} onFilterCategory={onFilterCategory}
      />
      <div className={styles.grid}>
        {DAYS.map((d) => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {calDays.map(({ day, month: mon, isOther }, i) => {
          const cellKey = `${mon}-${day}`;
          const cellPosts = getPostsForDay(day, mon);
          const actualYear = mon < 0 ? year - 1 : mon > 11 ? year + 1 : year;
          const actualMonth = ((mon % 12) + 12) % 12;
          const isToday = !isOther && isSameDay(new Date(actualYear, actualMonth, day), today);
          const isDragOver = dragOverCell === cellKey;

          return (
            <div
              key={i}
              className={`${styles.cell} ${isOther ? styles.cellOther : ''} ${isToday ? styles.cellToday : ''} ${isDragOver ? styles.cellDragOver : ''}`}
              onDragOver={(e) => handleDragOver(e, cellKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day, mon)}
            >
              <span className={styles.dayNum}>
                {isToday && <span className={styles.todayLabel}>Hôm nay</span>}
                {day}
              </span>
              <div className={styles.cellPosts}>
                {cellPosts.map((p) => (
                  <PostCard key={p.id} post={p} variant="calendar" onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Header({
  month, year, scheduledCount, view, onChangeView, onPrev, onNext,
  categories, filterStatus, filterCategory, onFilterStatus, onFilterCategory,
}) {
  return (
    <div className={styles.headerWrap}>
      <div className={styles.header}>
        <div className={styles.nav}>
          <button className={styles.navBtn} onClick={onPrev}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 className={styles.monthTitle}>{MONTHS[month]}, {year}</h2>
          <button className={styles.navBtn} onClick={onNext}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <span className={styles.count}>{scheduledCount} bài đã lên lịch</span>
        <div className={styles.viewToggle}>
          {['month', 'week', 'list'].map((v) => (
            <button
              key={v}
              className={`${styles.viewBtn} ${view === v ? styles.viewBtnActive : ''}`}
              onClick={() => onChangeView(v)}
            >
              {v === 'month' ? 'Tháng' : v === 'week' ? 'Tuần' : 'Danh sách'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterBar}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Trạng thái:</label>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.filterChip} ${filterStatus === opt.value ? styles.filterChipActive : ''}`}
              onClick={() => onFilterStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Danh mục:</label>
            <select
              className={styles.filterSelect}
              value={filterCategory}
              onChange={(e) => onFilterCategory(e.target.value)}
            >
              <option value="all">Tất cả</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
