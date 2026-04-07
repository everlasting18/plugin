import { useState } from 'react';
import styles from './ScheduleModal.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function pad(n) { return String(n).padStart(2, '0'); }

function formatDateVi(date) {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export default function ScheduleModal({ postTitle, targetDate, onConfirm, onCancel }) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  const handleConfirm = () => {
    const scheduled = new Date(targetDate);
    scheduled.setHours(hour, minute, 0, 0);
    onConfirm(scheduled);
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <h3 className={styles.title}>Hẹn giờ đăng bài</h3>
        </div>

        <div className={styles.postInfo}>
          <span className={styles.postLabel}>Bài viết:</span>
          <span className={styles.postTitle} dangerouslySetInnerHTML={{ __html: postTitle }} />
        </div>

        <div className={styles.dateInfo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>{formatDateVi(targetDate)}</span>
        </div>

        <div className={styles.timeSection}>
          <label className={styles.timeLabel}>Chọn giờ đăng:</label>
          <div className={styles.timePicker}>
            <select
              className={styles.timeSelect}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
            <span className={styles.timeSep}>:</span>
            <select
              className={styles.timeSelect}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Gợi ý:</span>
          {[
            { label: '6:00', h: 6, m: 0 },
            { label: '9:00', h: 9, m: 0 },
            { label: '12:00', h: 12, m: 0 },
            { label: '18:00', h: 18, m: 0 },
            { label: '20:00', h: 20, m: 0 },
          ].map((p) => (
            <button
              key={p.label}
              className={`${styles.presetBtn} ${hour === p.h && minute === p.m ? styles.presetBtnActive : ''}`}
              onClick={() => { setHour(p.h); setMinute(p.m); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>Hủy</button>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            Lên lịch lúc {pad(hour)}:{pad(minute)}
          </button>
        </div>
      </div>
    </div>
  );
}
