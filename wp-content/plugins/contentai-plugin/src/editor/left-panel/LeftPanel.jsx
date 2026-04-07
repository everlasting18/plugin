const { useState, useEffect, useRef, useCallback } = wp.element;
const { createPortal } = wp.element;
const { useDispatch } = wp.data;
const { store: editorStore } = wp.editor;

import styles from './LeftPanel.module.css';
import ResultCard from './ResultCard.jsx';
import { api } from '../../lib/api.js';

const POST_LENGTHS = [
  { value: 'short', label: 'Ngắn', desc: '~500 từ' },
  { value: 'medium', label: 'Vừa', desc: '~1200 từ' },
  { value: 'long', label: 'Dài', desc: '~2500 từ' },
];
const AUDIENCES = [
  { value: 'general', label: 'Chung' },
  { value: 'professional', label: 'Chuyên gia' },
  { value: 'beginner', label: 'Người mới' },
  { value: 'business', label: 'Doanh nghiệp' },
];
const FRAMEWORKS = [
  { value: 'none', label: 'Mặc định' },
  { value: 'aida', label: 'AIDA' },
  { value: 'pas', label: 'PAS' },
  { value: 'hero', label: "Hero's Journey" },
];

export default function LeftPanel({ keyword, onKeywordChange, results, addResult, removeResult }) {
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [settings, setSettings] = useState({ length: 'medium', audience: 'general', framework: 'none', webSearch: true });

  const { editPost } = useDispatch(editorStore);

  useEffect(() => {
    const tryInject = () => {
      const layout = document.querySelector('.edit-post-layout__content, .editor-editor-interface__content, .interface-interface-skeleton__content');
      if (!layout) return false;
      if (!containerRef.current) { containerRef.current = document.createElement('div'); containerRef.current.id = 'contentai-left-panel'; }
      if (!layout.contains(containerRef.current)) layout.insertBefore(containerRef.current, layout.firstChild);
      return true;
    };
    if (!tryInject()) { const t = setInterval(() => { if (tryInject()) clearInterval(t); }, 300); return () => clearInterval(t); }
    return () => { if (containerRef.current?.parentNode) containerRef.current.parentNode.removeChild(containerRef.current); };
  }, []);

  useEffect(() => {
    if (!settingsOpen) { setExpandedMenu(null); return; }
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSettingsOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [settingsOpen]);

  const handleInput = useCallback((e) => {
    onKeywordChange(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  }, [onKeywordChange]);

  const handleGenerate = useCallback(async () => {
    if (!keyword.trim() || loading) return;
    setLoading(true); setError('');
    try {
      const data = await api.generate({ keyword, tone: 'professional', length: settings.length, audience: settings.audience, framework: settings.framework, webSearch: settings.webSearch, action: 'full_article' });
      addResult({ type: 'full_article', label: 'Bài viết', content: data.content, title: data.title });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [keyword, settings, loading]);

  const handleKeyDown = useCallback((e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }, [handleGenerate]);

  const handleInsert = useCallback((result) => {
    editPost({ content: result.content, ...(result.title ? { title: result.title } : {}) });
    removeResult(result.id);
  }, [editPost, removeResult]);

  const menuItems = [
    { key: 'length', icon: '📏', label: 'Độ dài bài', options: POST_LENGTHS, current: settings.length },
    { key: 'audience', icon: '👥', label: 'Đối tượng', options: AUDIENCES, current: settings.audience },
    { key: 'framework', icon: '🧩', label: 'Framework', options: FRAMEWORKS, current: settings.framework },
  ];

  if (!containerRef.current) return null;

  return createPortal(
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.logo}>C</div>
        <span className={styles.brand}>ContentAI</span>
      </div>

      <div className={styles.body}>
        <div className={`${styles.card} ${loading ? styles.cardLoading : ''}`}>
          <textarea ref={textareaRef} className={styles.input} placeholder="Mô tả bài viết bạn muốn tạo..." value={keyword} onChange={handleInput} onKeyDown={handleKeyDown} rows={2} disabled={loading}/>

          <div className={styles.bar}>
            <div className={styles.barL} ref={dropdownRef}>
              <button className={`${styles.ico} ${settingsOpen ? styles.icoOn : ''}`} onClick={() => setSettingsOpen(!settingsOpen)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
              </button>
              {settingsOpen && (
                <div className={styles.dd}>
                  <div className={styles.ddTitle}>Tuỳ chỉnh</div>
                  {menuItems.map((m) => (
                    <div key={m.key}>
                      <button className={`${styles.ddRow} ${expandedMenu === m.key ? styles.ddRowOpen : ''}`} onClick={() => setExpandedMenu(expandedMenu === m.key ? null : m.key)}>
                        <span className={styles.ddIcon}>{m.icon}</span>
                        <span className={styles.ddLabel}>{m.label}</span>
                        <span className={styles.ddVal}>{m.options.find(o => o.value === m.current)?.label}</span>
                        <svg className={`${styles.ddChev} ${expandedMenu === m.key ? styles.ddChevOpen : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {expandedMenu === m.key && (
                        <div className={styles.ddSub}>
                          {m.options.map((o) => (
                            <button key={o.value} className={`${styles.ddOpt} ${m.current === o.value ? styles.ddOptOn : ''}`} onClick={() => { setSettings({...settings, [m.key]: o.value}); setExpandedMenu(null); }}>
                              <span className={styles.ddChk}>{m.current === o.value ? '✓' : ''}</span>
                              {o.label}
                              {o.desc && <span className={styles.ddDesc}>{o.desc}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className={styles.ddToggle}>
                    <span className={styles.ddIcon}>🌐</span>
                    <span className={styles.ddLabel}>Web search</span>
                    <button className={`${styles.tgl} ${settings.webSearch ? styles.tglOn : ''}`} onClick={() => setSettings({...settings, webSearch: !settings.webSearch})}><span className={styles.tglDot}/></button>
                  </div>
                </div>
              )}
            </div>
            <button className={`${styles.send} ${keyword.trim() && !loading ? styles.sendOn : ''}`} onClick={handleGenerate} disabled={!keyword.trim() || loading}>
              {loading ? <div className={styles.ldots}><span/><span/><span/></div> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>}
            </button>
          </div>
        </div>

        {loading && <div className={styles.prog}><div className={styles.progBar}/><span>Đang tạo nội dung...</span></div>}
        {error && <div className={styles.err}>{error}</div>}

        {results.length > 0 && (
          <div className={styles.res}>
            <div className={styles.resLabel}>Kết quả</div>
            {results.map(r => <ResultCard key={r.id} result={r} onInsert={() => handleInsert(r)} onDiscard={() => removeResult(r.id)} loading={loading}/>)}
          </div>
        )}
      </div>
    </div>,
    containerRef.current
  );
}
