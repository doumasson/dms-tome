/* PLACEHOLDER ART: needs real dark fantasy assets for production */

/**
 * BottomSheet — Responsive overlay wrapper.
 * On screens ≤ 600px wide or ≤ 420px tall, renders as a bottom drawer.
 * On larger screens, renders as a centered modal overlay.
 * Used by Bestiary, CraftingPanel, KeyboardHelp, AreaMapOverview, etc.
 */

import { useEffect, useState } from 'react';

const SMALL_THRESHOLD_W = 600;
const SMALL_THRESHOLD_H = 420;

export default function BottomSheet({ children, onClose, maxWidth = 640 }) {
  const [isSmall, setIsSmall] = useState(checkSmall);

  useEffect(() => {
    function onResize() { setIsSmall(checkSmall()); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (isSmall) {
    return (
      <div style={S.drawerOverlay} onClick={onClose}>
        <div style={S.drawerPanel} onClick={e => e.stopPropagation()}>
          {/* Drag handle */}
          <div style={S.dragHandle}>
            <div style={S.dragBar} />
          </div>
          {children}
        </div>
        <style>{drawerKeyframes}</style>
      </div>
    );
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalPanel, maxWidth }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
      <style>{modalKeyframes}</style>
    </div>
  );
}

function checkSmall() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= SMALL_THRESHOLD_W || window.innerHeight <= SMALL_THRESHOLD_H;
}

const S = {
  // Modal (large screens)
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(2px)',
    animation: 'bsModalFade 0.15s ease-out',
  },
  modalPanel: {
    width: '96vw', maxHeight: '86vh',
    overflowY: 'auto',
    animation: 'bsModalScale 0.2s ease-out',
  },

  // Drawer (small screens)
  drawerOverlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    animation: 'bsModalFade 0.15s ease-out',
  },
  drawerPanel: {
    width: '100%', maxHeight: '88vh',
    overflowY: 'auto',
    background: 'linear-gradient(170deg, rgba(26,20,10,0.99), rgba(14,11,6,1))',
    border: '2px solid rgba(212,175,55,0.3)',
    borderBottom: 'none',
    borderRadius: '14px 14px 0 0',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,175,55,0.1)',
    animation: 'bsDrawerSlide 0.25s ease-out',
    padding: '0 0 env(safe-area-inset-bottom, 0)',
  },
  dragHandle: {
    display: 'flex', justifyContent: 'center', padding: '10px 0 6px',
    cursor: 'grab',
  },
  dragBar: {
    width: 36, height: 4, borderRadius: 2,
    background: 'rgba(212,175,55,0.25)',
  },
};

const drawerKeyframes = `
  @keyframes bsDrawerSlide {
    0% { transform: translateY(100%); }
    100% { transform: translateY(0); }
  }
  @keyframes bsModalFade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
`;

const modalKeyframes = `
  @keyframes bsModalFade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes bsModalScale {
    0% { transform: scale(0.95); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
`;
