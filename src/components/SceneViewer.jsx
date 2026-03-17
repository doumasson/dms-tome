import useStore from '../store/useStore';

export default function SceneViewer() {
  const campaign = useStore((s) => s.campaign);
  const dmMode = useStore((s) => s.dmMode);
  const setCurrentScene = useStore((s) => s.setCurrentScene);

  if (!campaign.loaded || campaign.scenes.length === 0) {
    return (
      <div style={styles.container}>
        <h2>Scene Viewer</h2>
        <div className="card" style={styles.empty}>
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No campaign loaded.</p>
          <p>
            Import a campaign using the{' '}
            <strong style={{ color: 'var(--gold)' }}>Import</strong> tab to view scenes here.
          </p>
        </div>

        {/* Placeholder */}
        <div style={{ opacity: 0.5 }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Preview (example scene)</h3>
          <SceneCard
            scene={{
              id: 'preview',
              title: 'The Dark Forest',
              text: 'The trees loom overhead, their gnarled branches blotting out the moonlight. A distant howl echoes through the night. The party stands at the edge of the path, unsure which way to proceed.',
              choices: ['Follow the path deeper into the forest', 'Search for shelter nearby', 'Turn back to the village'],
              dmNotes: 'A werewolf patrols the eastern path. The shelter is an abandoned witch\'s hut with potions. Turning back triggers the bandit ambush from scene 1.',
            }}
            dmMode={dmMode}
            isActive={false}
          />
        </div>
      </div>
    );
  }

  const currentScene = campaign.scenes[campaign.currentSceneIndex] || campaign.scenes[0];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Scene Viewer</h2>
        <span style={styles.campaignTitle}>{campaign.title}</span>
      </div>

      {/* Scene navigation */}
      {campaign.scenes.length > 1 && (
        <div style={styles.sceneNav}>
          <span style={styles.sceneNavLabel}>Jump to scene:</span>
          <div style={styles.sceneButtons}>
            {campaign.scenes.map((scene, i) => (
              <button
                key={scene.id}
                className={i === campaign.currentSceneIndex ? 'btn-gold btn-sm' : 'btn-dark btn-sm'}
                onClick={() => setCurrentScene(i)}
              >
                {scene.title || `Scene ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Scene */}
      {currentScene && (
        <SceneCard scene={currentScene} dmMode={dmMode} isActive />
      )}
    </div>
  );
}

function SceneCard({ scene, dmMode, isActive }) {
  return (
    <div className="card" style={isActive ? styles.sceneCard : styles.sceneCardInactive}>
      <h3 style={styles.sceneTitle}>{scene.title}</h3>

      <div style={styles.sceneText}>{scene.text}</div>

      {scene.choices && scene.choices.length > 0 && (
        <div style={styles.choicesSection}>
          <h4 style={styles.choicesLabel}>Choices</h4>
          <ul style={styles.choicesList}>
            {scene.choices.map((choice, i) => (
              <li key={i} style={styles.choiceItem}>
                <span style={styles.choiceBullet}>{i + 1}.</span>
                {choice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scene.dmNotes && dmMode && (
        <div className="dm-only" style={styles.dmNotes}>
          <div style={styles.dmNotesHeader}>
            <span style={styles.dmNotesIcon}>🔒</span>
            <span style={styles.dmNotesTitle}>DM Notes</span>
          </div>
          <p style={styles.dmNotesText}>{scene.dmNotes}</p>
        </div>
      )}

      {scene.dmNotes && !dmMode && (
        <div style={styles.dmHidden}>
          <span style={styles.dmHiddenText}>[ DM notes hidden — enable DM Mode to view ]</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  campaignTitle: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    fontSize: '0.95rem',
  },
  empty: {
    padding: 32,
    textAlign: 'center',
  },
  sceneNav: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  sceneNavLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    paddingTop: 10,
    whiteSpace: 'nowrap',
  },
  sceneButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  sceneCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sceneCardInactive: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    opacity: 0.7,
  },
  sceneTitle: {
    fontSize: '1.4rem',
    color: 'var(--gold)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: 10,
  },
  sceneText: {
    color: 'var(--text-secondary)',
    fontSize: '1.05rem',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  choicesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  choicesLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  choicesList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  choiceItem: {
    display: 'flex',
    gap: 12,
    color: 'var(--text-secondary)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-light)',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  choiceBullet: {
    color: 'var(--gold)',
    fontWeight: 'bold',
    minWidth: 20,
  },
  dmNotes: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  dmNotesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dmNotesIcon: {
    fontSize: '1rem',
  },
  dmNotesTitle: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  dmNotesText: {
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  dmHidden: {
    padding: '8px 12px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
  },
  dmHiddenText: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
};
