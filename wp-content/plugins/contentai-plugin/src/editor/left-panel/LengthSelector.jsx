import styles from './LengthSelector.module.css';

const LENGTHS = [
  { value: 'short', label: '~500 từ' },
  { value: 'medium', label: '~1200 từ' },
  { value: 'long', label: 'Pro: ~2500 từ', isPro: true },
];

export default function LengthSelector({ selected, onChange, disabled }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>ĐỘ DÀI</span>
      <div className={styles.row}>
        {LENGTHS.map(({ value, label, isPro }) => (
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
