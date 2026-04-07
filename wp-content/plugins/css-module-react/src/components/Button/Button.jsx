import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', onClick }) {
  const className = `${styles.button} ${styles[variant] || ''}`;
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
