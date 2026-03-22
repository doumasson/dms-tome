import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ componentStack: info?.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: '#0d0a04',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: "'Cinzel', Georgia, serif",
      }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16, filter: 'drop-shadow(0 0 12px rgba(192,57,43,0.5))' }}>⚠</div>
          <h1 style={{ color: '#d4af37', fontSize: '1.4rem', margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ color: 'rgba(200,180,140,0.6)', fontSize: '0.85rem', margin: '0 0 24px', lineHeight: 1.6 }}>
            The dungeon has collapsed. Refresh the page to continue your adventure — your progress is saved.
          </p>
          <details style={{ textAlign: 'left', marginBottom: 24 }} open>
            <summary style={{ color: 'rgba(200,180,140,0.4)', fontSize: '0.72rem', cursor: 'pointer', marginBottom: 8 }}>
              Error details
            </summary>
            <pre style={{ color: '#e74c3c', fontSize: '0.68rem', background: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 6, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {this.state.error.message}{'\n\n'}{this.state.error.stack}{this.state.componentStack ? '\n\nComponent Stack:' + this.state.componentStack : ''}
            </pre>
          </details>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #d4af37, #a8841f)',
                border: 'none', borderRadius: 8, padding: '12px 28px',
                color: '#1a0e00', fontFamily: "'Cinzel', Georgia, serif",
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Reload & Continue
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('activeCampaignId');
                window.location.reload();
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,175,55,0.4)', borderRadius: 8,
                padding: '12px 28px', color: '#d4af37',
                fontFamily: "'Cinzel', Georgia, serif",
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }
}
