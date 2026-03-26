import { useState } from 'react';
import useStore from '../../store/useStore';

/**
 * QuestTracker — Persistent collapsible panel showing active quest objectives.
 * Positioned on the left side below the HUD. Shows active quests with
 * checkable objectives, quest giver info, and completion status.
 */

const STATUS_ICONS = {
  active: '◈',
  completed: '✓',
  failed: '✗',
};

const STATUS_COLORS = {
  active: '#d4af37',
  completed: '#2ecc71',
  failed: '#e74c3c',
};

export default function QuestTracker() {
  const quests = useStore(s => s.quests) || [];
  const questObjectives = useStore(s => s.campaign?.questObjectives) || [];
  const [collapsed, setCollapsed] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active' | 'all'

  // Combine store quests with legacy campaign questObjectives
  const allQuests = [...quests];

  // Convert legacy questObjectives into quest-like objects if present
  if (questObjectives.length > 0 && quests.length === 0) {
    questObjectives.forEach((obj, i) => {
      if (typeof obj === 'string') {
        allQuests.push({
          id: `legacy-${i}`,
          title: obj,
          status: 'active',
          objectives: [{ id: `obj-${i}`, text: obj, completed: false }],
        });
      } else if (obj.text || obj.title) {
        allQuests.push({
          id: obj.id || `legacy-${i}`,
          title: obj.title || obj.text,
          status: obj.completed ? 'completed' : 'active',
          objectives: obj.objectives || [{ id: `obj-${i}`, text: obj.text || obj.title, completed: !!obj.completed }],
          giver: obj.giver,
        });
      }
    });
  }

  const filtered = filter === 'active'
    ? allQuests.filter(q => q.status === 'active' || q.status === 'in_progress')
    : allQuests;

  if (allQuests.length === 0) return null;

  const activeCount = allQuests.filter(q => q.status === 'active' || q.status === 'in_progress').length;

  return (
    <div style={{
      maxWidth: 160,
      userSelect: 'none',
      marginTop: 4,
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px',
          background: 'rgba(10,8,6,0.85)',
          border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: collapsed ? 6 : '6px 6px 0 0',
          cursor: 'pointer',
          borderBottom: collapsed ? undefined : '1px solid rgba(212,175,55,0.2)',
        }}
      >
        <span style={{
          fontSize: '0.6rem', color: '#d4af37',
          fontFamily: "'Cinzel', Georgia, serif",
          fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Quests
        </span>
        {activeCount > 0 && (
          <span style={{
            fontSize: '0.55rem', color: '#ffd700',
            background: 'rgba(212,175,55,0.15)',
            padding: '1px 5px', borderRadius: 8,
            fontWeight: 700,
          }}>
            {activeCount}
          </span>
        )}
        <span style={{
          marginLeft: 'auto', fontSize: '0.6rem', color: 'rgba(212,175,55,0.5)',
          transition: 'transform 0.2s',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        }}>▾</span>
      </div>

      {/* Quest list */}
      {!collapsed && (
        <div style={{
          background: 'rgba(10,8,6,0.85)',
          border: '1px solid rgba(212,175,55,0.4)',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: '4px 0',
          maxHeight: 250,
          overflowY: 'auto',
        }}>
          {/* Filter tabs */}
          {allQuests.length > activeCount && (
            <div style={{
              display: 'flex', gap: 4, padding: '2px 6px 4px',
              borderBottom: '1px solid rgba(212,175,55,0.1)',
              marginBottom: 2,
            }}>
              {['active', 'all'].map(f => (
                <button
                  key={f}
                  onClick={(e) => { e.stopPropagation(); setFilter(f); }}
                  style={{
                    fontSize: '0.5rem', padding: '1px 6px', borderRadius: 3,
                    border: `1px solid ${filter === f ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: filter === f ? 'rgba(212,175,55,0.15)' : 'transparent',
                    color: filter === f ? '#d4af37' : 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{
              fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)',
              textAlign: 'center', padding: '8px 6px', fontStyle: 'italic',
            }}>
              No {filter} quests
            </div>
          )}

          {filtered.map(quest => (
            <QuestItem key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestItem({ quest }) {
  const [expanded, setExpanded] = useState(quest.status === 'active');
  const status = quest.status || 'active';
  const objectives = quest.objectives || [];
  const completedCount = objectives.filter(o => o.completed).length;

  return (
    <div style={{ padding: '3px 8px' }}>
      {/* Quest title row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 4,
          cursor: objectives.length > 0 ? 'pointer' : 'default',
        }}
      >
        <span style={{
          fontSize: '0.6rem', color: STATUS_COLORS[status] || '#d4af37',
          lineHeight: 1.4, flexShrink: 0,
        }}>
          {STATUS_ICONS[status] || '◈'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.6rem',
            color: status === 'completed' ? 'rgba(46,204,113,0.7)' :
                   status === 'failed' ? 'rgba(231,76,60,0.7)' : '#e8d5a3',
            fontWeight: 600, lineHeight: 1.3,
            textDecoration: status === 'completed' ? 'line-through' : 'none',
          }}>
            {quest.title || quest.name}
          </div>
          {quest.giver && (
            <div style={{
              fontSize: '0.45rem', color: 'rgba(212,175,55,0.4)',
              marginTop: 1,
            }}>
              from {quest.giver}
            </div>
          )}
        </div>
        {objectives.length > 1 && (
          <span style={{
            fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)',
            flexShrink: 0,
          }}>
            {completedCount}/{objectives.length}
          </span>
        )}
      </div>

      {/* Objectives */}
      {expanded && objectives.length > 0 && (
        <div style={{ paddingLeft: 12, marginTop: 2 }}>
          {objectives.map((obj, i) => (
            <div key={obj.id || i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 4,
              padding: '1px 0',
            }}>
              <span style={{
                fontSize: '0.5rem', flexShrink: 0, marginTop: 1,
                color: obj.completed ? '#2ecc71' : 'rgba(255,255,255,0.25)',
              }}>
                {obj.completed ? '☑' : '☐'}
              </span>
              <span style={{
                fontSize: '0.5rem', lineHeight: 1.3,
                color: obj.completed ? 'rgba(46,204,113,0.5)' : 'rgba(255,255,255,0.5)',
                textDecoration: obj.completed ? 'line-through' : 'none',
              }}>
                {obj.text || obj.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
