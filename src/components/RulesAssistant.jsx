import { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { askRulesQuestion } from '../lib/narratorApi';
import { SPELLS } from '../data/spells';
import { WEAPONS, ARMOR, CONSUMABLES } from '../data/equipment';

// Build keyword → SRD excerpt map for context injection
function buildSrdContext(question) {
  const q = question.toLowerCase();
  const snippets = [];

  // Spell lookup
  const matchedSpells = SPELLS.filter(sp => q.includes(sp.name.toLowerCase())).slice(0, 2);
  matchedSpells.forEach(sp => {
    snippets.push(
      `**${sp.name}** (Level ${sp.level} ${sp.school}, ${sp.castingTime}, Range ${sp.range}ft, ${sp.duration}${sp.concentration ? ', Concentration' : ''})\n${sp.description}`
    );
  });

  // Item lookup
  const allItems = [...WEAPONS, ...ARMOR, ...CONSUMABLES];
  const matchedItems = allItems.filter(it => it.name && q.includes(it.name.toLowerCase())).slice(0, 2);
  matchedItems.forEach(it => {
    const detail = it.damage
      ? `Damage: ${it.damage} ${it.damageType}`
      : it.baseAC
        ? `AC: ${it.baseAC}${it.addDex ? ' + DEX' : ''}${it.maxDex != null ? ` (max +${it.maxDex})` : ''}`
        : it.description || '';
    snippets.push(`**${it.name}**: ${detail}`);
  });

  return snippets.length > 0 ? snippets.join('\n\n') : '';
}

export default function RulesAssistant() {
  const sessionApiKey = useStore(s => s.sessionApiKey);
  const [open, setOpen]       = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [history, setHistory] = useState([]); // [{ q, a }]
  const inputRef = useRef(null);

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;
    if (!sessionApiKey) {
      setError('No API key — configure it in Settings.');
      return;
    }
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const ctx = buildSrdContext(q);
      const result = await askRulesQuestion(q, ctx, sessionApiKey);
      setHistory(prev => [...prev, { q, a: result }]);
      setAnswer(result);
      setQuestion('');
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button style={st.fab} onClick={handleOpen} title="Rules Assistant (D&D 5e SRD)">
        ?
      </button>

      {open && (
        <div style={st.overlay} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={st.modal}>
            {/* Header */}
            <div style={st.header}>
              <div style={st.headerLeft}>
                <span style={st.headerIcon}>📖</span>
                <div>
                  <div style={st.headerTitle}>Rules Assistant</div>
                  <div style={st.headerSub}>Ask anything about D&D 5e SRD rules</div>
                </div>
              </div>
              <button style={st.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div style={st.history}>
                {history.map((h, i) => (
                  <div key={i} style={st.historyItem}>
                    <div style={st.historyQ}>Q: {h.q}</div>
                    <div style={st.historyA}>{h.a}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading / latest answer */}
            {loading && (
              <div style={st.loading}>Consulting the SRD…</div>
            )}
            {!loading && answer && history.length === 0 && (
              <div style={st.answer}>{answer}</div>
            )}
            {error && <div style={st.error}>{error}</div>}

            {/* Input */}
            <div style={st.inputRow}>
              <input
                ref={inputRef}
                style={st.input}
                placeholder="e.g. How does grappling work? What does Hex do?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                disabled={loading}
              />
              <button
                style={{ ...st.askBtn, opacity: (!question.trim() || loading) ? 0.5 : 1 }}
                onClick={handleAsk}
                disabled={!question.trim() || loading}
              >
                {loading ? '…' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const st = {
  fab: {
    position: 'fixed', bottom: 80, right: 18, zIndex: 500,
    width: 40, height: 40, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2a1a08, #1a0e04)',
    border: '1px solid rgba(212,175,55,0.45)',
    color: '#d4af37', fontSize: '1.2rem', fontWeight: 900,
    cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
    fontFamily: "'Cinzel', Georgia, serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 7000,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 500,
    background: 'linear-gradient(180deg, #1c1208 0%, #140d05 100%)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 12, padding: 20,
    display: 'flex', flexDirection: 'column', gap: 14,
    boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
    maxHeight: '80vh',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerIcon: { fontSize: '1.6rem' },
  headerTitle: { fontFamily: "'Cinzel', Georgia, serif", color: '#d4af37', fontSize: '1rem', fontWeight: 700 },
  headerSub: { fontSize: '0.72rem', color: 'rgba(200,180,140,0.5)', marginTop: 2 },
  closeBtn: {
    background: 'transparent', border: '1px solid rgba(212,175,55,0.2)',
    color: 'rgba(200,180,140,0.5)', borderRadius: 5, padding: '4px 10px',
    cursor: 'pointer', fontSize: '0.85rem',
  },
  history: {
    display: 'flex', flexDirection: 'column', gap: 12,
    overflowY: 'auto', maxHeight: 320, paddingRight: 4,
  },
  historyItem: { borderTop: '1px solid rgba(212,175,55,0.1)', paddingTop: 10 },
  historyQ: { fontSize: '0.78rem', color: '#d4af37', fontStyle: 'italic', marginBottom: 6 },
  historyA: { fontSize: '0.84rem', color: '#e8dcc8', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  loading: { fontSize: '0.82rem', color: 'rgba(200,180,140,0.5)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' },
  answer: { fontSize: '0.84rem', color: '#e8dcc8', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  error: { fontSize: '0.8rem', color: '#e74c3c', padding: '6px 10px', background: 'rgba(231,76,60,0.08)', borderRadius: 6 },
  inputRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: 7, padding: '9px 12px', color: '#e8dcc8', fontSize: '0.85rem',
    fontFamily: 'inherit', outline: 'none',
  },
  askBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37)',
    color: '#1a0e00', border: 'none', borderRadius: 7,
    padding: '9px 18px', fontWeight: 700, cursor: 'pointer',
    fontSize: '0.85rem', fontFamily: "'Cinzel', Georgia, serif",
    flexShrink: 0,
  },
};
