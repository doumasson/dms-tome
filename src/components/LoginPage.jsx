import { supabase } from '../lib/supabase';

function D20Icon() {
  return (
    <svg width="64" height="64" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.5))' }}>
      <polygon points="18,2 34,13 28,31 8,31 2,13" stroke="#d4af37" strokeWidth="1.8" fill="rgba(212,175,55,0.07)" />
      <polygon points="18,7 30,27 6,27" stroke="#d4af37" strokeWidth="1.2" fill="rgba(212,175,55,0.04)" opacity="0.7" />
      <text x="18" y="22" textAnchor="middle" fontSize="9" fontFamily="'Cinzel', Georgia, serif"
        fontWeight="700" fill="#d4af37" letterSpacing="0.5">20</text>
    </svg>
  );
}

export default function LoginPage({ inviteCode }) {
  async function handleDiscordSignIn() {
    if (inviteCode) {
      localStorage.setItem('pendingInvite', inviteCode);
    }
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <D20Icon />
        <h1 style={styles.title}>DungeonMind</h1>
        <p style={styles.subtitle}>Your AI Narrator Awaits</p>

        {inviteCode && (
          <div style={styles.inviteBanner}>
            <span style={styles.inviteIcon}>⚔</span>
            <span>You've been invited to join a campaign!<br />Sign in to accept the invitation.</span>
          </div>
        )}

        <button onClick={handleDiscordSignIn} style={styles.discordBtn}>
          <DiscordIcon />
          Sign in with Discord
        </button>

        <p style={styles.hint}>Sign in to create or join campaigns, track combat, and manage your adventures.</p>
      </div>

      <div style={styles.bg} />
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#fff" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561 19.9312 19.9312 0 005.9932 3.0272.0778.0778 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286 19.8975 19.8975 0 006.0023-3.0272.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
    </svg>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
    padding: 24,
  },
  bg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.04) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'linear-gradient(180deg, #211408 0%, #180f08 100%)',
    border: '1px solid var(--border-gold)',
    borderRadius: 16,
    padding: '48px 40px',
    maxWidth: 420,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.04)',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontFamily: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--gold)',
    margin: 0,
    letterSpacing: '0.06em',
    textShadow: '0 0 20px rgba(212,175,55,0.3)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontFamily: "'Cinzel', Georgia, serif",
    letterSpacing: '0.08em',
    margin: 0,
  },
  inviteBanner: {
    background: 'rgba(212,175,55,0.08)',
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    padding: '12px 16px',
    color: 'var(--parchment)',
    fontSize: '0.88rem',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    lineHeight: 1.5,
    width: '100%',
    boxSizing: 'border-box',
  },
  inviteIcon: {
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  discordBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#5865F2',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '14px 28px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    transition: 'opacity 0.15s',
    letterSpacing: '0.01em',
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 300,
  },
};
