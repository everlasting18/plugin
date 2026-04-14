import { useState } from 'react';
import styles from './ScheduleModal.module.css';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];
const MERIDIEMS = ['AM', 'PM'];

function pad(n) { return String(n).padStart(2, '0'); }

function to24Hour(hour12, meridiem) {
  if (meridiem === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function formatTime(hour12, minute, meridiem) {
  return `${pad(hour12)}:${pad(minute)} ${meridiem}`;
}

function formatDateVi(date) {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${days[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export default function ScheduleModal({ postTitle, targetDate, onConfirm, onCancel }) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [meridiem, setMeridiem] = useState('AM');

  const handleConfirm = () => {
    const scheduled = new Date(targetDate);
    scheduled.setHours(to24Hour(hour, meridiem), minute, 0, 0);
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
            <select
              className={styles.timeSelect}
              value={meridiem}
              onChange={(e) => setMeridiem(e.target.value)}
            >
              {MERIDIEMS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Gợi ý:</span>
          {[
            { label: '06:00 AM', h: 6, m: 0, meridiem: 'AM' },
            { label: '09:00 AM', h: 9, m: 0, meridiem: 'AM' },
            { label: '12:00 PM', h: 12, m: 0, meridiem: 'PM' },
            { label: '06:00 PM', h: 6, m: 0, meridiem: 'PM' },
            { label: '08:00 PM', h: 8, m: 0, meridiem: 'PM' },
          ].map((p) => (
            <button
              key={p.label}
              className={`${styles.presetBtn} ${hour === p.h && minute === p.m && meridiem === p.meridiem ? styles.presetBtnActive : ''}`}
              onClick={() => { setHour(p.h); setMinute(p.m); setMeridiem(p.meridiem); }}
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
            Lên lịch lúc {formatTime(hour, minute, meridiem)}
          </button>
        </div>
      </div>
    </div>
  );
}
