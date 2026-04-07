import styles from './ToneSelector.module.css';

const TONES = [
  { value: 'professional', label: 'Chuyên nghiệp' },
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'persuasive', label: 'Thuyết phục' },
  { value: 'simple', label: 'Đơn giản' },
];

export default function ToneSelector({ selected, onChange, disabled }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>TONE</span>
        <span className={styles.count}>{TONES.length} TONES</span>
      </div>
      <div className={styles.row}>
        {TONES.map(({ value, label }) => (
          <button
            key={value}
            className={`${styles.chip} ${selected === value ? styles.active : ''}`}
            onClick={() => onChange(value)}
            disabled={disabled}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
