import styles from './QuickActions.module.css';

const ACTIONS = [
  { action: 'intro', label: 'Intro', icon: '\uD83D\uDCDD' },
  { action: 'outline', label: 'Outline', icon: '\u2726' },
  { action: 'conclusion', label: 'Kết luận', icon: '\uD83D\uDD1A' },
  { action: 'cta', label: 'CTA', icon: '\uD83C\uDFAF' },
];

export default function QuickActions({ onAction, disabled }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>TẠO NHANH</span>
      <div className={styles.grid}>
        {ACTIONS.map(({ action, label, icon }) => (
          <button
            key={action}
            className={styles.btn}
            onClick={() => onAction(action, label)}
            disabled={disabled}
          >
            <span className={styles.icon}>{icon}</span> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
