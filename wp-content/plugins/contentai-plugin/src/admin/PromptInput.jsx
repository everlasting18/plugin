import { useState, useRef } from 'react';
import styles from './PromptInput.module.css';
import SettingsDropdown from './SettingsDropdown.jsx';

export default function PromptInput({ onSubmit, loading }) {
  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    length: 'medium',
    audience: 'general',
    framework: 'none',
    webSearch: true,
  });
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    if (!prompt.trim() || loading) return;
    onSubmit({ prompt: prompt.trim(), ...settings });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInput = (e) => {
    setPrompt(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputBar}>
        <div className={styles.leftActions}>
          <button
            className={styles.iconBtn}
            onClick={() => setSettingsOpen(!settingsOpen)}
            title="Cài đặt"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="4" y1="16" x2="20" y2="16" />
              <circle cx="9" cy="8" r="2" fill="currentColor" />
              <circle cx="15" cy="16" r="2" fill="currentColor" />
            </svg>
          </button>

          <SettingsDropdown
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onChange={setSettings}
          />
        </div>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Viết bài về hành trình khởi nghiệp của tôi..."
          value={prompt}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />

        <div className={styles.rightActions}>
          <button
            className={`${styles.submitBtn} ${prompt.trim() && !loading ? styles.submitBtnActive : ''}`}
            onClick={handleSubmit}
            disabled={!prompt.trim() || loading}
            title="Generate"
          >
            {loading ? (
              <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
