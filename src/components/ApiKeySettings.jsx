import { useState } from 'react';
import { getClaudeApiKey, setClaudeApiKey } from '../lib/claudeApi';
import { getOpenAiKey, setOpenAiKey } from '../lib/dalleApi';

export default function ApiKeySettings({ userId, onClose }) {
  const [claudeKey, setClaudeKey] = useState(getClaudeApiKey(userId));
  const [openAiKey, setOpenAiKeyState] = useState(getOpenAiKey(userId));
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setClaudeApiKey(userId, claudeKey.trim());
    setOpenAiKey(userId, openAiKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        <h2 style={styles.title}>API Keys</h2>
        <p style={styles.hint}>
          Keys are stored locally on this device only — never sent to any server except the respective API.
        </p>

        {/* Claude Key */}
        <label style={styles.label}>Claude API Key <span style={styles.labelHint}>(AI Narrator • console.anthropic.com)</span></label>
        <input
          type="password"
          value={claudeKey}
          onChange={e => setClaudeKey(e.target.value)}
          placeholder="sk-ant-..."
          style={styles.input}
          autoComplete="off"
          spellCheck={false}
        />
        {getClaudeApiKey(userId) && <p style={styles.savedNote}>✓ Claude key saved</p>}

        <div style={{ height: 18 }} />

        {/* OpenAI Key */}
        <label style={styles.label}>OpenAI API Key <span style={styles.labelHint}>(Scene images • platform.openai.com)</span></label>
        <input
          type="password"
          value={openAiKey}
          onChange={e => setOpenAiKeyState(e.target.value)}
          placeholder="sk-..."
          style={styles.input}
          autoComplete="off"
          spellCheck={false}
        />
        {getOpenAiKey(userId) && <p style={styles.savedNote}>✓ OpenAI key saved</p>}
        <p style={styles.costNote}>~$0.08 per scene image (DALL-E 3, 1792×1024)</p>

        <div style={styles.btnRow}>
          <button
            onClick={handleSave}
            disabled={saved}
            style={styles.saveBtn}
          >
            {saved ? '✓ Saved!' : 'Save Keys'}
          </button>
          <button onClick={onClose} style={styles.clearBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    boxSizing: 'border-box',
  },
  modal: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    border: '1px solid var(--border-gold)',
    borderRadius: 14,
    padding: '32px 36px',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: 4,
    lineHeight: 1,
  },
  title: {
    fontFamily: "'Cinzel', Georgia, serif",
    color: 'var(--gold)',
    fontSize: '1.2rem',
    fontWeight: 700,
    margin: '0 0 10px',
    letterSpacing: '0.03em',
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    lineHeight: 1.6,
    margin: '0 0 20px',
  },
  labelHint: {
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    fontWeight: 400,
    letterSpacing: 0,
  },
  costNote: {
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  link: {
    color: 'var(--parchment)',
    fontFamily: 'monospace',
  },
  label: {
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    fontFamily: "'Cinzel', Georgia, serif",
    display: 'block',
    marginBottom: 6,
  },
  input: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    outline: 'none',
    letterSpacing: '0.05em',
  },
  savedNote: {
    color: 'var(--success-light)',
    fontSize: '0.78rem',
    margin: '6px 0 0',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 18,
  },
  saveBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: '0.9rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    minHeight: 46,
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: '0.82rem',
    fontFamily: "'Cinzel', Georgia, serif",
    cursor: 'pointer',
    minHeight: 46,
  },
};
