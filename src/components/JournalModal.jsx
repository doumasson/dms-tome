import useStore from '../store/useStore'

export default function JournalModal({ onClose }) {
  const journal = useStore(s => s.journal) || []

  const criticalEntries = journal.filter(e => e.type === 'critical')
  const questEntries = journal.filter(e => e.type === 'sidequest')

  return (
    <div className="journal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="journal-modal">
        <button className="journal-close" onClick={onClose}>✕</button>

        <div className="journal-header">
          <svg width="180" height="10" viewBox="0 0 180 10" className="journal-divider">
            <path d="M0,5 L60,5 Q75,0 90,5 Q105,10 120,5 L180,5" fill="none" stroke="#4a3520" strokeWidth="1" opacity="0.6"/>
          </svg>
          <h1 className="journal-title">Journal</h1>
          <svg width="180" height="10" viewBox="0 0 180 10" className="journal-divider">
            <path d="M0,5 L60,5 Q75,10 90,5 Q105,0 120,5 L180,5" fill="none" stroke="#4a3520" strokeWidth="1" opacity="0.6"/>
          </svg>
        </div>

        <div className="journal-content">
          {journal.length === 0 ? (
            <p className="journal-empty">Your journal is empty. Speak with the people of this world to uncover its secrets.</p>
          ) : (
            <>
              {criticalEntries.length > 0 && (
                <div className="journal-section">
                  <h2 className="journal-section-title">◆ Story Events</h2>
                  {criticalEntries.map((entry, i) => (
                    <div key={i} className="journal-entry journal-entry-critical">
                      <div className="journal-entry-header">
                        <span className="journal-entry-npc">{entry.npcName}</span>
                        <span className="journal-entry-zone">{entry.zoneName}</span>
                      </div>
                      <p className="journal-entry-text">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {questEntries.length > 0 && (
                <div className="journal-section">
                  <h2 className="journal-section-title">◆ Quests</h2>
                  {questEntries.map((entry, i) => (
                    <div key={i} className="journal-entry">
                      <div className="journal-entry-header">
                        <span className="journal-entry-npc">{entry.npcName}</span>
                        <span className="journal-entry-zone">{entry.zoneName}</span>
                      </div>
                      <p className="journal-entry-text">{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
