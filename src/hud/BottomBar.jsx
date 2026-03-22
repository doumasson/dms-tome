import { useState } from 'react'
import useStore from '../store/useStore'
import PartyPortraits from './PartyPortraits'
import SessionLog from './SessionLog'
import ActionArea from './ActionArea'
import CombatActionBar from './CombatActionBar'
import QuickslotBar from './QuickslotBar'

export default function BottomBar({ areaTheme, onTool, onChat, onEndTurn, onAction, onPortraitClick, onUseQuickslot }) {
  const inCombat = useStore(s => s.encounter.phase === 'combat')
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className={`hud-bottom-bar${drawerOpen ? ' drawer-open' : ''}`}>
      {/* Drawer handle — visible only on phone via CSS */}
      <div className="hud-drawer-handle" onClick={() => setDrawerOpen(o => !o)}>
        <div className="hud-drawer-handle-bar" />
      </div>
      {/* Stone slab background only — no top filigree */}
      {/* Bottom stone slab — image asset */}
      <img src="/ui/bar-bottom.png" className="hud-bar-bottom-img" alt="" draggable={false} />
      <div className="hud-bottom-bar-content">
        <PartyPortraits onPortraitClick={onPortraitClick} />
        <SessionLog onChat={onChat} />
        {inCombat ? (
          <CombatActionBar onEndTurn={onEndTurn} onAction={onAction} />
        ) : (
          <ActionArea areaTheme={areaTheme} onTool={onTool} onChat={onChat} />
        )}
        <QuickslotBar onUseSlot={onUseQuickslot} />
      </div>
    </div>
  )
}
