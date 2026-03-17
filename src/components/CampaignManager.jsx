import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useStore from '../store/useStore';

export default function CampaignManager({ onClose }) {
  const activeCampaign = useStore((s) => s.activeCampaign);
  const user = useStore((s) => s.user);
  const setActiveCampaign = useStore((s) => s.setActiveCampaign);
  const setIsDM = useStore((s) => s.setIsDM);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferTarget, setTransferTarget] = useState(null); // user_id to transfer to
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaign_members')
      .select('user_id, role, joined_at, profiles(name, avatar_url)')
      .eq('campaign_id', activeCampaign.id)
      .order('joined_at', { ascending: true });

    if (!error && data) {
      setMembers(data);
    }
    setLoading(false);
  }

  async function handleTransferDM() {
    if (!transferTarget) return;
    setTransferring(true);
    setError('');

    const { error: e1 } = await supabase
      .from('campaigns')
      .update({ dm_user_id: transferTarget })
      .eq('id', activeCampaign.id);

    if (e1) { setError(e1.message); setTransferring(false); return; }

    await supabase
      .from('campaign_members')
      .update({ role: 'player' })
      .eq('campaign_id', activeCampaign.id)
      .eq('user_id', user.id);

    await supabase
      .from('campaign_members')
      .update({ role: 'dm' })
      .eq('campaign_id', activeCampaign.id)
      .eq('user_id', transferTarget);

    // Update store — current user is no longer DM
    setActiveCampaign({ ...activeCampaign, dm_user_id: transferTarget });
    setIsDM(false);
    setTransferring(false);
    setTransferTarget(null);
    await fetchMembers();
  }

  function handleCopyInvite() {
    const link = `${window.location.origin}?invite=${activeCampaign.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteLink = `${window.location.origin}?invite=${activeCampaign.invite_code}`;

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        <h2 style={styles.title}>Manage Campaign</h2>

        {/* Invite section */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Invite Link</p>
          <div style={styles.inviteRow}>
            <span style={styles.inviteText}>{inviteLink}</span>
            <button onClick={handleCopyInvite} style={styles.copyBtn}>
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          <p style={styles.hint}>Share this link or code <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{activeCampaign.invite_code}</strong> with players.</p>
        </div>

        {/* Members section */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Campaign Members</p>
          {loading ? (
            <p style={styles.hint}>Loading members...</p>
          ) : members.length === 0 ? (
            <p style={styles.hint}>No members found.</p>
          ) : (
            <div style={styles.memberList}>
              {members.map((m) => {
                const isCurrentUser = m.user_id === user.id;
                const isCurrentDM = m.user_id === activeCampaign.dm_user_id;
                const name = m.profiles?.name || 'Unknown';
                const avatar = m.profiles?.avatar_url;

                return (
                  <div key={m.user_id} style={styles.memberRow}>
                    <div style={styles.memberInfo}>
                      {avatar ? (
                        <img src={avatar} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
                      ) : (
                        <div style={styles.avatarPlaceholder}>{name[0]?.toUpperCase()}</div>
                      )}
                      <div>
                        <span style={styles.memberName}>
                          {name}
                          {isCurrentUser && <span style={styles.youTag}> (you)</span>}
                        </span>
                        <span style={{ ...styles.roleTag, ...(isCurrentDM ? styles.roleTagDM : styles.roleTagPlayer) }}>
                          {isCurrentDM ? 'DM' : 'Player'}
                        </span>
                      </div>
                    </div>

                    {/* Transfer button — only show for other players when current user is DM */}
                    {!isCurrentUser && !isCurrentDM && activeCampaign.dm_user_id === user.id && (
                      transferTarget === m.user_id ? (
                        <div style={styles.confirmRow}>
                          <span style={styles.confirmText}>Transfer DM to {name}?</span>
                          <button
                            onClick={handleTransferDM}
                            disabled={transferring}
                            style={styles.confirmBtn}
                          >
                            {transferring ? 'Transferring...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setTransferTarget(null)}
                            style={styles.cancelBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setTransferTarget(m.user_id)}
                          style={styles.transferBtn}
                        >
                          Make DM
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {error && <p style={styles.errorMsg}>{error}</p>}
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
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
    position: 'relative',
    maxHeight: '85vh',
    overflowY: 'auto',
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
    margin: '0 0 20px',
    letterSpacing: '0.03em',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', Georgia, serif",
    textTransform: 'uppercase',
    margin: '0 0 10px',
  },
  inviteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 8,
  },
  inviteText: {
    color: 'var(--parchment)',
    fontSize: '0.78rem',
    fontFamily: 'monospace',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    flexShrink: 0,
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    margin: 0,
    lineHeight: 1.5,
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '10px 14px',
    flexWrap: 'wrap',
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid var(--border-gold)',
    objectFit: 'cover',
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  memberName: {
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    display: 'block',
    marginBottom: 2,
  },
  youTag: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontStyle: 'italic',
  },
  roleTag: {
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontFamily: "'Cinzel', Georgia, serif",
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  roleTagDM: {
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
  },
  roleTagPlayer: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
  },
  transferBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
    flexShrink: 0,
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  confirmText: {
    color: 'var(--parchment)',
    fontSize: '0.78rem',
  },
  confirmBtn: {
    background: 'linear-gradient(135deg, #f0c868, #d4af37, #a8841f)',
    color: '#1a0e00',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', Georgia, serif",
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-light)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', Georgia, serif",
  },
  errorMsg: {
    color: 'var(--danger-light)',
    fontSize: '0.82rem',
    marginTop: 8,
  },
};
