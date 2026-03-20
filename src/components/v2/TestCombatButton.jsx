import useStore from '../../store/useStore'

/**
 * Debug button to start a test combat encounter.
 */
export default function TestCombatButton({ myCharacter, addNarratorMessage }) {
  return (
    <button
      onClick={() => {
        try {
          const { startEncounter } = useStore.getState()
          const char = myCharacter || {
            id: 'test-hero', name: 'Test Hero', hp: 20, maxHp: 20, ac: 15,
            class: 'Fighter', level: 3, speed: 30, type: 'player',
            attackBonus: 5, damageMod: 3,
            stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
            attacks: [{ name: 'Longsword', bonus: '+5', damage: '1d8+3' }],
          }
          startEncounter([
            { name: 'Goblin', hp: 15, maxHp: 15, ac: 15, isEnemy: true, type: 'enemy',
              attacks: [{ name: 'Scimitar', bonus: '+4', damage: '1d6+2' }],
              position: { x: 6, y: 4 }, speed: 30,
              stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } },
            { name: 'Goblin Archer', hp: 12, maxHp: 12, ac: 13, isEnemy: true, type: 'enemy',
              attacks: [{ name: 'Shortbow', bonus: '+4', damage: '1d6+2' }],
              position: { x: 8, y: 3 }, speed: 30,
              stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 } },
          ], [char], true)
        } catch (err) {
          console.error('[GameV2] Test combat failed:', err)
          addNarratorMessage({ role: 'dm', speaker: 'System', text: `Combat test failed: ${err.message}` })
        }
      }}
      className="hud-campaign-btn"
      style={{
        position: 'fixed', top: 50, right: 10, zIndex: 100,
        flexDirection: 'row', gap: 6, padding: '6px 14px',
        borderColor: 'rgba(204,51,51,0.4)',
      }}
    >
      <span>&#x2694;</span>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#cc3333', fontWeight: 900, letterSpacing: 2 }}>
        TEST COMBAT
      </span>
    </button>
  )
}
