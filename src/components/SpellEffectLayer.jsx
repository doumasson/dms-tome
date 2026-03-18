import { ConeOverlay, SphereOverlay, LineOverlay } from './SpellTargeting';

/**
 * Renders persistent spell area effect overlays on the battle map.
 * Effects remain until concentration breaks or duration ends.
 */
export default function SpellEffectLayer({ effects, cellPx, mapW, mapH }) {
  if (!effects?.length) return null;

  return (
    <>
      {effects.map(e => {
        if (e.areaType === 'sphere') {
          return (
            <SphereOverlay
              key={e.id}
              cx={e.centerX} cy={e.centerY}
              radiusFt={e.radiusFt}
              cellPx={cellPx} mapW={mapW} mapH={mapH}
            />
          );
        }
        if (e.areaType === 'cone') {
          return (
            <ConeOverlay
              key={e.id}
              casterX={e.casterX} casterY={e.casterY}
              angleDeg={e.angleDeg} lengthFt={e.lengthFt}
              halfWidthDeg={e.halfWidthDeg}
              cellPx={cellPx} mapW={mapW} mapH={mapH}
            />
          );
        }
        if (e.areaType === 'line') {
          return (
            <LineOverlay
              key={e.id}
              ox={e.ox} oy={e.oy}
              angleDeg={e.angleDeg} lengthFt={e.lengthFt}
              widthFt={e.widthFt}
              cellPx={cellPx} mapW={mapW} mapH={mapH}
            />
          );
        }
        return null;
      })}
    </>
  );
}
