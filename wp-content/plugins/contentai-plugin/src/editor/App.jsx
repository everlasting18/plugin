const { useState, useEffect, useCallback } = wp.element;

import TopBar from './top-bar/TopBar.jsx';
import LeftPanel from './left-panel/LeftPanel.jsx';
import FloatingToolbar from './floating-toolbar/FloatingToolbar.jsx';

export default function App() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);

  const addResult = useCallback((result) => {
    setResults(prev => [{ ...result, id: Date.now() }, ...prev]);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('contentai-left-open', panelOpen);
    return () => document.body.classList.remove('contentai-left-open');
  }, [panelOpen]);

  return (
    <>
      <TopBar panelOpen={panelOpen} onToggle={() => setPanelOpen(v => !v)} />

      {panelOpen && (
        <LeftPanel
          keyword={keyword}
          onKeywordChange={setKeyword}
          results={results}
          addResult={addResult}
        />
      )}

      <FloatingToolbar addResult={addResult} />
    </>
  );
}
