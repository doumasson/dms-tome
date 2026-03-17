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
  async function handleGoogleSignIn() {
    if (inviteCode) {
      localStorage.setItem('pendingInvite', inviteCode);
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <D20Icon />
        <h1 style={styles.title}>DM's Tome</h1>
        <p style={styles.subtitle}>D&amp;D 5e Campaign Manager</p>

        {inviteCode && (
          <div style={styles.inviteBanner}>
            <span style={styles.inviteIcon}>⚔</span>
            <span>You've been invited to join a campaign!<br />Sign in to accept the invitation.</span>
          </div>
        )}

        <button onClick={handleGoogleSignIn} style={styles.googleBtn}>
          <GoogleIcon />
          Sign in with Google
        </button>

        <p style={styles.hint}>Sign in to create or join campaigns, track combat, and manage your adventures.</p>
      </div>

      <div style={styles.bg} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
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
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    color: '#1f1f1f',
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
