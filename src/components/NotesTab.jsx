import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

export default function NotesTab() {
  const dmMode   = useStore(s => s.dmMode);
  const notes    = useStore(s => s.campaign.notes);
  const setNote  = useStore(s => s.setNote);
  const saveSettings = useStore(s => s.saveSettingsToSupabase);

  const [dmDraft,     setDmDraft]     = useState(notes?.dm     || '');
  const [sharedDraft, setSharedDraft] = useState(notes?.shared || '');
  const saveTimer = useRef();

  // Sync drafts if notes change externally (Realtime)
  useEffect(() => { setDmDraft(notes?.dm     || ''); }, [notes?.dm]);
  useEffect(() => { setSharedDraft(notes?.shared || ''); }, [notes?.shared]);

  function handleChange(type, value) {
    if (type === 'dm')     setDmDraft(value);
    if (type === 'shared') setSharedDraft(value);
    setNote(type, value);
    // Debounce Supabase save
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSettings(), 1500);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Shared notes — visible to everyone */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <h3 style={s.sectionTitle}>📋 Session Notes</h3>
          <span style={s.badge}>Visible to all</span>
        </div>
        <textarea
          value={sharedDraft}
          onChange={e => handleChange('shared', e.target.value)}
          readOnly={!dmMode}
          placeholder={dmMode ? 'Add session notes here — visible to all players…' : 'No session notes yet.'}
          style={{ ...s.textarea, opacity: dmMode ? 1 : 0.85, cursor: dmMode ? 'text' : 'default' }}
          rows={8}
        />
        {!dmMode && <p style={s.hint}>Only the DM can edit session notes.</p>}
      </section>

      {/* DM-only notes */}
      {dmMode && (
        <section style={{ ...s.section, borderColor: 'rgba(192,57,43,0.4)' }}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>🔒 DM Notes</h3>
            <span style={{ ...s.badge, color: '#e74c3c', borderColor: 'rgba(192,57,43,0.5)', background: 'rgba(192,57,43,0.1)' }}>DM only</span>
          </div>
          <textarea
            value={dmDraft}
            onChange={e => handleChange('dm', e.target.value)}
            placeholder="Private DM notes — upcoming plot points, secret info, NPC motivations…"
            style={s.textarea}
            rows={10}
          />
        </section>
      )}
    </div>
  );
}

const s = {
  section: {
    background: '#1a1006',
    border: '1px solid #2a1a0a',
    borderRadius: 8,
    padding: '16px 18px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    margin: 0,
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '1rem',
    color: 'var(--gold)',
    fontWeight: 700,
  },
  badge: {
    fontSize: '0.65rem',
    color: '#2ecc71',
    border: '1px solid rgba(46,204,113,0.4)',
    background: 'rgba(46,204,113,0.08)',
    borderRadius: 4,
    padding: '2px 8px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  textarea: {
    width: '100%',
    background: '#0f0a04',
    border: '1px solid #2a1a0a',
    color: 'var(--text-primary)',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: '0.88rem',
    lineHeight: 1.7,
    resize: 'vertical',
    fontFamily: "'Georgia', serif",
    boxSizing: 'border-box',
    outline: 'none',
  },
  hint: {
    margin: '6px 0 0',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
};
