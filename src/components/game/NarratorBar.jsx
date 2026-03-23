import { useState, useRef, useEffect } from 'react';
import './NarratorBar.css';

/**
 * Narrator Bar Component
 * Collapsed 20%, expands to 40% of screen
 * Text input for player actions, push-to-talk button
 * Displays narrator messages with auto-scroll
 */
export default function NarratorBar({ messages = [], onSendMessage = () => {}, isListening = false }) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleTalk = () => {
    // Push-to-talk triggers speech recognition
    if (typeof window.SpeechRecognition !== 'undefined' || typeof window.webkitSpeechRecognition !== 'undefined') {
      // Speech recognition would be initialized here
      // For now, just toggle as a button
      console.log('Speech recognition triggered');
    }
  };

  return (
    <div className={`narrator-bar ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Toggle button */}
      <button
        className="narrator-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Collapse narrator' : 'Expand narrator'}
      >
        <span className="toggle-icon">{expanded ? '▼' : '▲'}</span>
        <span className="toggle-text">The Narrator</span>
      </button>

      {/* Messages area - only visible when expanded */}
      {expanded && (
        <div className="narrator-content">
          <div className="narrator-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>Awaiting The Narrator...</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`narrator-message ${msg.role || 'narrator'}`}
                >
                  {msg.role === 'player' && <span className="role-label">You:</span>}
                  {msg.role === 'narrator' && <span className="role-label">Narrator:</span>}
                  <span className="message-text">{msg.text}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="narrator-input-section">
            <div className="input-group">
              <textarea
                className="action-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your action..."
                rows={2}
              />
              <button
                className="send-button"
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                Send
              </button>
            </div>

            {/* Push-to-talk button */}
            <button
              className={`talk-button ${isListening ? 'listening' : ''}`}
              onClick={handleToggleTalk}
              title="Hold to speak your action"
            >
              🎤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
