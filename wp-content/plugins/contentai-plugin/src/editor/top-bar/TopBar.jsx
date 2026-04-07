const { useEffect, useRef } = wp.element;
const { createPortal } = wp.element;

import styles from './TopBar.module.css';

export default function TopBar({ panelOpen, onToggle }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const tryInject = () => {
      const header = document.querySelector('.edit-post-header__settings, .editor-header__settings');
      if (!header) return false;
      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
        containerRef.current.id = 'contentai-topbar';
        containerRef.current.className = styles.portalWrap;
      }
      if (!header.contains(containerRef.current)) header.insertBefore(containerRef.current, header.firstChild);
      return true;
    };
    if (!tryInject()) { const t = setInterval(() => { if (tryInject()) clearInterval(t); }, 300); return () => clearInterval(t); }
    return () => { if (containerRef.current?.parentNode) containerRef.current.parentNode.removeChild(containerRef.current); };
  }, []);

  if (!containerRef.current) return null;

  return createPortal(
    <button className={`${styles.btn} ${panelOpen ? styles.active : ''}`} onClick={onToggle}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
      ContentAI
    </button>,
    containerRef.current
  );
}
