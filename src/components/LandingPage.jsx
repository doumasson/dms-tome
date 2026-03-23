import { useState } from 'react';
import './LandingPage.css';

/**
 * Landing Page
 * First screen users see - login/signup CTA with product branding
 * Dark fantasy aesthetic with prominent call-to-action
 */

export default function LandingPage({ onLoginClick = () => {} }) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <div className="landing-hero">
        {/* Logo/Branding */}
        <div className="landing-logo">
          <div className="d20-icon">
            <svg width="80" height="80" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,2 34,13 28,31 8,31 2,13" stroke="#d4af37" strokeWidth="2" fill="rgba(212,175,55,0.1)" />
              <polygon points="18,7 30,27 6,27" stroke="#d4af37" strokeWidth="1.5" fill="rgba(212,175,55,0.05)" opacity="0.7" />
              <text x="18" y="22" textAnchor="middle" fontSize="12" fontFamily="'Cinzel', Georgia, serif"
                fontWeight="700" fill="#d4af37" letterSpacing="0.5">20</text>
            </svg>
          </div>
          <h1 className="landing-title">DungeonMind</h1>
          <p className="landing-tagline">Your AI Narrator Awaits</p>
        </div>

        {/* Value Proposition */}
        <div className="landing-description">
          <p className="description-heading">Experience SRD 5.1 Adventure Like Never Before</p>
          <p className="description-text">
            Gather your party. Create a character. The Narrator takes it from there.
          </p>
          <p className="description-subtext">
            AI-powered storytelling for 1-6 players. No human DM required.
          </p>
        </div>

        {/* Features Preview */}
        <div className="landing-features">
          <div className="feature-item">
            <span className="feature-icon">🎭</span>
            <span className="feature-name">Dynamic Storytelling</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚔️</span>
            <span className="feature-name">Real Combat</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌍</span>
            <span className="feature-name">Living World</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <span className="feature-name">Multiplayer</span>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="landing-footer">
        <button
          className={`cta-button ${isHovering ? 'hovering' : ''}`}
          onClick={onLoginClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <span className="cta-text">Begin Your Adventure</span>
          <span className="cta-arrow">→</span>
        </button>
        <p className="landing-footer-text">
          Create a campaign or join an existing one. Play SRD 5.1 D&amp;D with The Narrator as your DM.
        </p>
      </div>

      {/* Background Decoration */}
      <div className="landing-ornament top-left" />
      <div className="landing-ornament bottom-right" />
    </div>
  );
}
