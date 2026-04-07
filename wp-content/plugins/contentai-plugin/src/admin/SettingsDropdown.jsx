import { useState, useRef, useEffect } from 'react';
import styles from './SettingsDropdown.module.css';

const POST_LENGTHS = [
  { value: 'short', label: 'Ngắn (~500 từ)' },
  { value: 'medium', label: 'Trung bình (~1200 từ)' },
  { value: 'long', label: 'Dài (~2500 từ)' },
];

const AUDIENCES = [
  { value: 'general', label: 'Chung' },
  { value: 'professional', label: 'Chuyên gia' },
  { value: 'beginner', label: 'Người mới' },
  { value: 'business', label: 'Doanh nghiệp' },
];

const FRAMEWORKS = [
  { value: 'none', label: 'Không' },
  { value: 'aida', label: 'AIDA' },
  { value: 'pas', label: 'PAS' },
  { value: 'hero', label: "Hero's Journey" },
];

export default function SettingsDropdown({ open, onClose, settings, onChange }) {
  const ref = useRef(null);
  const [expandedMenu, setExpandedMenu] = useState(null);

  useEffect(() => {
    if (!open) { setExpandedMenu(null); return; }
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const menuItems = [
    { key: 'length', icon: '☰', label: 'Post length', options: POST_LENGTHS, current: settings.length },
    { key: 'audience', icon: '👥', label: 'Target audience', options: AUDIENCES, current: settings.audience },
    { key: 'framework', icon: '◎', label: 'Writing framework', options: FRAMEWORKS, current: settings.framework },
  ];

  return (
    <div className={styles.dropdown} ref={ref}>
      {menuItems.map((item) => (
        <div key={item.key}>
          <button
            className={`${styles.menuItem} ${expandedMenu === item.key ? styles.menuItemActive : ''}`}
            onClick={() => setExpandedMenu(expandedMenu === item.key ? null : item.key)}
          >
            <span className={styles.menuIcon}>{item.icon}</span>
            <span className={styles.menuLabel}>{item.label}</span>
            <span className={styles.menuArrow}>›</span>
          </button>
          {expandedMenu === item.key && (
            <div className={styles.subMenu}>
              {item.options.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.subMenuItem} ${item.current === opt.value ? styles.subMenuItemActive : ''}`}
                  onClick={() => { onChange({ ...settings, [item.key]: opt.value }); setExpandedMenu(null); }}
                >
                  {item.current === opt.value && <span className={styles.check}>✓</span>}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className={styles.toggleItem}>
        <span className={styles.menuIcon}>🌐</span>
        <span className={styles.menuLabel}>Web search</span>
        <button
          className={`${styles.toggle} ${settings.webSearch ? styles.toggleOn : ''}`}
          onClick={() => onChange({ ...settings, webSearch: !settings.webSearch })}
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>
    </div>
  );
}
