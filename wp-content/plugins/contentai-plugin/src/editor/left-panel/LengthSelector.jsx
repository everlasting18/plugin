import styles from './LengthSelector.module.css';

const COUNTS = [
  { value: 1, label: '1 bài' },
  { value: 2, label: '2 bài' },
  { value: 3, label: '3 bài', isPro: true },
];

export default function LengthSelector({ selected, onChange, disabled }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>SỐ BÀI</span>
      <div className={styles.row}>
        {COUNTS.map(({ value, label, isPro }) => (
          <button
            key={value}
            className={`${styles.chip} ${selected === value ? styles.active : ''} ${isPro ? styles.pro : ''}`}
            onClick={() => !isPro && onChange(value)}
            disabled={disabled || isPro}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
