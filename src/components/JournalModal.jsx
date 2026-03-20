import { useState } from 'react'
import useStore from '../store/useStore'

export default function JournalModal({ onClose }) {
  const journal = useStore(s => s.journal) || []
  const quests = useStore(s => s.quests) || []
  const [activeTab, setActiveTab] = useState('story')

  const criticalEntries = journal.filter(e => e.type === 'critical')
  const questEntries = journal.filter(e => e.type === 'sidequest')

  const activeQuests = quests.filter(q => q.status === 'active')
  const completedQuests = quests.filter(q => q.status !== 'active')

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

        {/* Tabs */}
        <div style={tabStyles.bar}>
          <button
            style={{ ...tabStyles.tab, ...(activeTab === 'story' ? tabStyles.tabActive : {}) }}
            onClick={() => setActiveTab('story')}
          >
            Story
          </button>
          <button
            style={{ ...tabStyles.tab, ...(activeTab === 'quests' ? tabStyles.tabActive : {}) }}
            onClick={() => setActiveTab('quests')}
          >
            Quests
            {activeQuests.length > 0 && (
              <span style={tabStyles.badge}>{activeQuests.length}</span>
            )}
          </button>
        </div>

        {/* Story tab */}
        {activeTab === 'story' && (
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
        )}

        {/* Quests tab */}
        {activeTab === 'quests' && (
          <div className="journal-content">
            {quests.length === 0 ? (
              <p className="journal-empty">No quests yet. Explore the world and speak with its inhabitants.</p>
            ) : (
              <>
                {activeQuests.length > 0 && (
                  <div className="journal-section">
                    <h2 className="journal-section-title">◆ Active Quests</h2>
                    {activeQuests.map(quest => (
                      <QuestCard key={quest.id} quest={quest} />
                    ))}
                  </div>
                )}
                {completedQuests.length > 0 && (
                  <div className="journal-section">
                    <h2 className="journal-section-title" style={{ opacity: 0.5 }}>◆ Completed</h2>
                    {completedQuests.map(quest => (
                      <QuestCard key={quest.id} quest={quest} dimmed />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestCard({ quest, dimmed }) {
  const objectives = quest.objectives || []
  const completedCount = objectives.filter(o => o.completed).length

  return (
    <div style={{ ...questStyles.card, opacity: dimmed ? 0.5 : 1 }}>
      <div style={questStyles.header}>
        <span style={questStyles.title}>{quest.title}</span>
        {quest.source && <span style={questStyles.source}>{quest.source}</span>}
      </div>
      {quest.description && (
        <p style={questStyles.desc}>{quest.description}</p>
      )}
      {objectives.length > 0 && (
        <div style={questStyles.objectives}>
          {objectives.map((obj, i) => (
            <div key={i} style={questStyles.objective}>
              <span style={{ ...questStyles.check, color: obj.completed ? '#c9a84c' : '#4a3a28' }}>
                {obj.completed ? '◆' : '◇'}
              </span>
              <span style={{ ...questStyles.objText, textDecoration: obj.completed ? 'line-through' : 'none', opacity: obj.completed ? 0.5 : 1 }}>
                {obj.text}
              </span>
            </div>
          ))}
          <div style={questStyles.progress}>
            {completedCount}/{objectives.length} objectives
          </div>
        </div>
      )}
    </div>
  )
}

const tabStyles = {
  bar: {
    display: 'flex',
    borderBottom: '1px solid rgba(74,53,32,0.4)',
    marginBottom: 12,
    gap: 0,
  },
  tab: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#6a5a40',
    fontFamily: "'Cinzel', serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: '8px 0 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'color 0.15s',
  },
  tabActive: {
    color: '#c9a84c',
    borderBottom: '2px solid #c9a84c',
  },
  badge: {
    background: '#c9a84c',
    color: '#1a1208',
    fontFamily: "'Cinzel', serif",
    fontSize: 9,
    fontWeight: 700,
    borderRadius: 2,
    padding: '1px 5px',
    lineHeight: 1.4,
  },
}

const questStyles = {
  card: {
    marginBottom: 14,
    padding: '10px 12px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(74,53,32,0.3)',
    borderLeft: '2px solid #c9a84c',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 12,
    color: '#c9a84c',
    fontWeight: 700,
  },
  source: {
    fontSize: 9,
    color: '#6a5a40',
    fontStyle: 'italic',
  },
  desc: {
    fontSize: 11,
    color: '#8a7a60',
    lineHeight: 1.5,
    margin: '0 0 8px',
  },
  objectives: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  objective: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
  },
  check: {
    fontSize: 10,
    flexShrink: 0,
    marginTop: 1,
  },
  objText: {
    fontSize: 11,
    color: '#8a7a60',
    lineHeight: 1.4,
  },
  progress: {
    fontSize: 9,
    color: '#6a5a40',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
  },
}
