import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { getTimeOfDay } from '../../lib/gameTime';

/**
 * DayNightOverlay — Renders a full-screen tint overlay based on in-game time.
 * Transitions smoothly between time-of-day phases.
 * Covers the game canvas but not UI elements (pointer-events: none).
 */

// Color + opacity per time-of-day phase
const TINTS = {
  dawn:  { color: '255, 180, 100', opacity: 0.08 },  // warm golden glow
  day:   { color: '0, 0, 0',       opacity: 0 },      // clear — no tint
  dusk:  { color: '180, 80, 40',   opacity: 0.12 },   // orange/red sunset
  night: { color: '15, 10, 40',    opacity: 0.35 },    // deep blue darkness
};

// Smooth interpolation between phases based on exact hour
function getTint(hour) {
  const h = ((hour % 24) + 24) % 24;

  // Dawn transition: 4-6 (night→dawn), 6-8 (dawn→day)
  if (h >= 4 && h < 6) {
    const t = (h - 4) / 2;
    return lerpTint(TINTS.night, TINTS.dawn, t);
  }
  if (h >= 6 && h < 8) {
    const t = (h - 6) / 2;
    return lerpTint(TINTS.dawn, TINTS.day, t);
  }
  // Day: 8-17
  if (h >= 8 && h < 17) {
    return TINTS.day;
  }
  // Dusk transition: 17-19 (day→dusk), 19-21 (dusk→night)
  if (h >= 17 && h < 19) {
    const t = (h - 17) / 2;
    return lerpTint(TINTS.day, TINTS.dusk, t);
  }
  if (h >= 19 && h < 21) {
    const t = (h - 19) / 2;
    return lerpTint(TINTS.dusk, TINTS.night, t);
  }
  // Night: 21-4
  return TINTS.night;
}

function lerpTint(a, b, t) {
  const ac = a.color.split(',').map(Number);
  const bc = b.color.split(',').map(Number);
  const r = Math.round(ac[0] + (bc[0] - ac[0]) * t);
  const g = Math.round(ac[1] + (bc[1] - ac[1]) * t);
  const bl = Math.round(ac[2] + (bc[2] - ac[2]) * t);
  const opacity = a.opacity + (b.opacity - a.opacity) * t;
  return { color: `${r}, ${g}, ${bl}`, opacity };
}

export default function DayNightOverlay() {
  const gameTime = useStore(s => s.gameTime);
  const hour = gameTime?.hour ?? 12;

  const tint = useMemo(() => getTint(hour), [hour]);

  // No overlay needed during day
  if (tint.opacity < 0.005) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        background: `rgba(${tint.color}, ${tint.opacity})`,
        transition: 'background 2s ease',
        mixBlendMode: 'multiply',
      }}
    />
  );
}

/**
 * TimeDisplay — small clock showing current in-game time
 * Can be placed in HUD or game header
 */
export function TimeDisplay() {
  const gameTime = useStore(s => s.gameTime);
  if (!gameTime) return null;

  const hour = gameTime.hour ?? 12;
  const tod = getTimeOfDay(hour);
  const h = Math.floor(hour) % 12 || 12;
  const mins = Math.round((hour % 1) * 60);
  const ampm = Math.floor(hour) < 12 ? 'AM' : 'PM';

  const icons = { dawn: '\u{1F305}', day: '\u{2600}\u{FE0F}', dusk: '\u{1F307}', night: '\u{1F319}' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: '0.65rem', color: 'rgba(212,175,55,0.7)',
      fontFamily: "'Cinzel', Georgia, serif",
    }}>
      <span>{icons[tod]}</span>
      <span>{h}:{String(mins).padStart(2, '0')} {ampm}</span>
      <span style={{ color: 'rgba(212,175,55,0.4)', fontSize: '0.55rem' }}>Day {gameTime.day ?? 1}</span>
    </div>
  );
}
