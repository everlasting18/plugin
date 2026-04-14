const { useState, useEffect, useRef, useCallback } = wp.element;
const { createPortal } = wp.element;

import styles from './LeftPanel.module.css';
import ResultCard from './ResultCard.jsx';
import { api } from '../../lib/api.js';

const POST_COUNTS = [
  { value: 1, label: '1 bài', desc: 'Nhanh nhất' },
  { value: 2, label: '2 bài', desc: 'Cân bằng' },
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

// ─── License helpers ────────────────────────────────────────────────────────

function getLicenseInfo() {
  if (typeof window === 'undefined' || !window.contentaiData) {
    return { isPro: false, usedCount: 0, freeLimit: 5 };
  }
  const d = window.contentaiData;
  return {
    isPro: !!d.isPro,
    usedCount: parseInt(d.usedCount, 10) || 0,
    freeLimit: parseInt(d.freeLimit, 10) || 5,
  };
}

function getUpgradeUrl() {
  const siteUrl = window.contentaiData?.siteUrl
    ? encodeURIComponent(window.contentaiData.siteUrl)
    : '';
  return `https://contentai.vn/dashboard${siteUrl ? `?domain=${siteUrl}` : ''}`;
}

// ─── Error display (contextual messages based on error code) ───────────────

function getErrorDisplay(err) {
  if (!err) return null;
  const code = err.code || '';
  const status = err.status || 0;

  if (code === 'usage_limit_reached' || status === 429) {
    return {
      message: err.message || 'Bạn đã dùng hết 5 bài miễn phí/tháng. Nâng cấp Pro để sử dụng không giới hạn.',
      type: 'warning',
    };
  }
  if (code === 'license_invalid' || status === 403) {
    return {
      message: err.message || 'License key không hợp lệ hoặc đã hết hạn. Kiểm tra lại trong Settings.',
      type: 'error',
    };
  }
  if (code === 'auth_required' || status === 401) {
    return {
      message: err.message || 'Vui lòng nhập domain trong Settings để bắt đầu.',
      type: 'error',
    };
  }
  return {
    message: err.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
    type: 'error',
  };
}

export default function LeftPanel({ keyword, onKeywordChange, results, addResult, removeResult }) {
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('error'); // 'error' | 'warning'
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [settings, setSettings] = useState({ count: 1, audience: 'general', framework: 'none', webSearch: true });
  const [streamLines, setStreamLines] = useState([]);
  const [licenseInfo, setLicenseInfo] = useState(getLicenseInfo);

  // Refresh license info periodically
  useEffect(() => {
    const interval = setInterval(() => setLicenseInfo(getLicenseInfo()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Proactive check: warn if close to limit (free only)
  const remaining = licenseInfo.freeLimit - licenseInfo.usedCount;
  const nearLimit = !licenseInfo.isPro && remaining > 0 && remaining <= 2;

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

    // Proactive check for free users near limit
    if (!licenseInfo.isPro && remaining <= 0) {
      const errDisplay = getErrorDisplay({ code: 'usage_limit_reached' });
      setError(errDisplay.message);
      setErrorType(errDisplay.type);
      return;
    }

    setLoading(true);
    setError('');
    setStreamLines([]);
    try {
      for await (const line of api.generateStream({ keyword, tone: 'professional', count: settings.count, audience: settings.audience, framework: settings.framework, webSearch: settings.webSearch, action: 'full_article' })) {
        if (line.startsWith('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6).trim());
            setStreamLines([]);
            if (Array.isArray(data.posts)) {
              data.posts.forEach(post => {
                addResult({ type: 'full_article', label: 'Bài viết', content: post.content, title: post.title });
              });
            } else if (data.content) {
              addResult({ type: 'full_article', label: 'Bài viết', content: data.content, title: data.title });
            }
            // Update usage count after successful generation
            setLicenseInfo(prev => ({ ...prev, usedCount: prev.usedCount + 1 }));
          } catch (e) {
            console.warn('[ContentAI] Failed to parse DONE response:', e);
          }
        } else {
          setStreamLines(prev => [...prev.slice(-30), { text: line, time: Date.now() }]);
        }
      }
    } catch (err) {
      const errDisplay = getErrorDisplay(err);
      setError(errDisplay.message);
      setErrorType(errDisplay.type);
    } finally { setLoading(false); setStreamLines([]); }
  }, [keyword, settings, loading, addResult, licenseInfo, remaining]);

  const handleKeyDown = useCallback((e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }, [handleGenerate]);

  const handleInsert = useCallback((result) => {
    const { editPost } = wp.data.dispatch('core/editor');

    // Set title
    if (result.title) {
      editPost({ title: result.title });
    }

    // Parse HTML content to blocks and insert
    let contentToInsert = result.content || '';
    // Remove H1 heading from content (title is set separately)
    contentToInsert = contentToInsert
      .replace(/<!-- wp:heading\s*\{[^}]*"level"\s*:\s*1[^}]*\}\s*-->[\s\S]*?<!-- \/wp:heading -->\s*/gi, '')
      .trim();

    if (contentToInsert) {
      const parsedBlocks = wp.blocks.parse(contentToInsert);
      if (parsedBlocks.length > 0) {
        // Get existing blocks, prepend new blocks
        const existingBlocks = wp.data.select('core/editor').getBlocks();
        const newBlocks = [...parsedBlocks, ...existingBlocks];
        wp.data.dispatch('core/editor').resetBlocks(newBlocks);
      }
    }
  }, []);

  const menuItems = [
    { key: 'count', icon: '📏', label: 'Số bài viết', options: POST_COUNTS, current: settings.count },
    { key: 'audience', icon: '👥', label: 'Đối tượng', options: AUDIENCES, current: settings.audience },
    { key: 'framework', icon: '🧩', label: 'Framework', options: FRAMEWORKS, current: settings.framework },
  ];

  if (!containerRef.current) return null;

  return createPortal(
    <div className={styles.panel}>
      {/* ─── Header with tier badge ─── */}
      <div className={styles.header}>
        <div className={styles.logo}>C</div>
        <span className={styles.brand}>ContentAI</span>
        {licenseInfo.isPro ? (
          <span className={styles.tierBadgePro}>Pro</span>
        ) : (
          <span className={styles.tierBadgeFree}>{licenseInfo.usedCount}/{licenseInfo.freeLimit}</span>
        )}
      </div>

      <div className={styles.body}>
        {/* ─── Usage warning (near limit) ─── */}
        {nearLimit && !loading && (
          <div className={styles.warningBanner}>
            <span className={styles.warningIcon}>⚠️</span>
            <span>Còn <strong>{remaining}</strong> bài miễn phí tháng này.</span>
            <a href={getUpgradeUrl()} target="_blank" rel="noopener" className={styles.warningLink}>Nâng cấp</a>
          </div>
        )}

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

        {loading && (
          <div className={styles.streamBox}>
            {streamLines.length === 0 && <div className={styles.prog}><div className={styles.progBar}/><span>Đang tạo nội dung...</span></div>}
            {streamLines.map((l, i) => <div key={i} className={styles.streamLine}>{l.text}</div>)}
          </div>
        )}

        {/* ─── Contextual Error / Warning ─── */}
        {error && (
          <div className={errorType === 'warning' ? styles.warningBox : styles.err}>
            <div className={styles.errHeader}>
              {errorType === 'warning' ? '⚠️' : '❌'}
              <span>{errorType === 'warning' ? 'Hết quota' : 'Lỗi'}</span>
            </div>
            <p className={styles.errMessage}>{error}</p>
            {errorType === 'warning' && (
              <a href={getUpgradeUrl()} target="_blank" rel="noopener" className={styles.upgradeBtn}>
                Nâng cấp Pro — Không giới hạn
              </a>
            )}
          </div>
        )}

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