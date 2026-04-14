const { useState, useEffect, useCallback, useRef } = wp.element;
const { createPortal } = wp.element;

import styles from './FloatingToolbar.module.css';
import { api } from '../../lib/api.js';

const REWRITE_ACTIONS = [
  { action: 'rewrite', label: 'Rewrite AI' },
  { action: 'shorter', label: 'Ngắn hơn' },
  { action: 'longer', label: 'Dài hơn' },
  { action: 'simpler', label: 'Đơn giản hơn' },
];

export default function FloatingToolbar({ addResult }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const toolbarRef = useRef(null);
  const selectedRangeRef = useRef(null);

  const replaceSelectedText = useCallback((range, text) => {
    if (!range || !text) return false;

    const selection = window.getSelection();
    const rootNode = range.commonAncestorContainer?.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;
    const editable = rootNode?.closest?.('[contenteditable="true"]');

    if (!selection || !editable) {
      return false;
    }

    editable.focus();
    selection.removeAllRanges();
    selection.addRange(range);

    let replaced = false;

    if (typeof document.execCommand === 'function') {
      try {
        replaced = document.execCommand('insertText', false, text);
      } catch {
        replaced = false;
      }
    }

    if (!replaced) {
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      replaced = true;
    }

    editable.dispatchEvent(new Event('input', { bubbles: true }));
    editable.dispatchEvent(new Event('change', { bubbles: true }));

    return replaced;
  }, []);

  // Listen selection changes trong editor
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        selectedRangeRef.current = null;
        // Delay ẩn để user kịp click button
        setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) {
            setVisible(false);
          }
        }, 200);
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 10) return; // Quá ngắn

      // Kiểm tra selection nằm trong editor
      const editorArea = document.querySelector(
        '.editor-styles-wrapper, .block-editor-writing-flow'
      );
      if (!editorArea) return;

      const anchorNode = selection.anchorNode;
      if (!editorArea.contains(anchorNode)) return;

      setSelectedText(text);
      selectedRangeRef.current = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

      // Tính vị trí toolbar
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPosition({
        top: rect.top - 48 + window.scrollY,
        left: rect.left + (rect.width / 2),
      });
      setVisible(true);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleRewrite = useCallback(async (instruction) => {
    if (!selectedText || loading) return;
    const range = selectedRangeRef.current ? selectedRangeRef.current.cloneRange() : null;
    setLoading(true);
    try {
      const data = await api.rewrite({ text: selectedText, instruction });
      const applied = replaceSelectedText(range, data.content);
      if (!applied) {
        addResult({
          type: 'rewrite',
          label: `Rewrite — ${instruction}`,
          content: data.content,
        });
      }
      setVisible(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedText, loading, addResult, replaceSelectedText]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className={styles.toolbar}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent selection loss
    >
      {REWRITE_ACTIONS.map(({ action, label }) => (
        <button
          key={action}
          className={`${styles.btn} ${action === 'rewrite' ? styles.primary : ''}`}
          onClick={() => handleRewrite(action)}
          disabled={loading}
        >
          {label}
        </button>
      ))}
      <div className={styles.hint}>Hiện khi bôi chọn text</div>
    </div>,
    document.body
  );
}
