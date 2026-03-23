import { useState } from 'react';
import './SpellTargeting.css';

/**
 * Spell Targeting Component
 * SVG cone/line/sphere on the map
 * Confirms before casting
 */

export default function SpellTargeting({
  spell = {},
  onConfirm = () => {},
  onCancel = () => {}
}) {
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [selectedTargets, setSelectedTargets] = useState([]);

  const {
    name = 'Magic Missile',
    range = 60,
    areaType = 'line', // line, cone, sphere, single
    areaSize = 15,
    affectedCount = 3,
    dc = 14,
    savingThrow = 'dex'
  } = spell;

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTargetPosition({ x, y });
  };

  const handleTargetSelect = (targetId) => {
    setSelectedTargets(prev =>
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const getAreaShape = () => {
    const x = targetPosition.x;
    const y = targetPosition.y;
    const size = areaSize;

    switch (areaType) {
      case 'cone':
        return `M ${x} ${y} L ${x + size} ${y - size} L ${x + size} ${y + size} Z`;
      case 'sphere':
        return `M ${x - size} ${y} A ${size} ${size} 0 1 0 ${x + size} ${y} A ${size} ${size} 0 1 0 ${x - size} ${y}`;
      case 'line':
        return `M ${x} ${y} L ${x} ${y - size * 2}`;
      default:
        return '';
    }
  };

  return (
    <div className="spell-targeting-overlay">
      <div className="targeting-header">
        <h3>{name}</h3>
        <p className="spell-range">Range: {range} ft | DC: {dc} | Save: {savingThrow.toUpperCase()}</p>
      </div>

      <div className="targeting-map" onClick={handleMapClick}>
        <svg className="targeting-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {/* Background */}
          <rect width="100" height="100" fill="rgba(26, 26, 26, 0.7)" />

          {/* Grid */}
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(212, 175, 55, 0.1)" strokeWidth="0.1" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Area of effect */}
          <path
            d={getAreaShape()}
            fill="rgba(100, 150, 255, 0.3)"
            stroke="#6496ff"
            strokeWidth="0.5"
            strokeDasharray="1,1"
          />

          {/* Center point */}
          <circle
            cx={targetPosition.x}
            cy={targetPosition.y}
            r="1.5"
            fill="#d4af37"
            stroke="#e8d5a3"
            strokeWidth="0.5"
          />

          {/* Target indicators (placeholder) */}
          {[
            { id: 1, x: 35, y: 30, name: 'Goblin 1' },
            { id: 2, x: 55, y: 45, name: 'Goblin 2' },
            { id: 3, x: 65, y: 25, name: 'Goblin 3' }
          ].map(target => {
            const isInArea = Math.hypot(target.x - targetPosition.x, target.y - targetPosition.y) < (areaSize * 1.5);
            const isSelected = selectedTargets.includes(target.id);

            return (
              <g key={target.id} onClick={(e) => { e.stopPropagation(); handleTargetSelect(target.id); }}>
                <circle
                  cx={target.x}
                  cy={target.y}
                  r="2"
                  fill={isInArea ? (isSelected ? '#2ecc71' : '#f39c12') : '#666'}
                  stroke={isInArea ? '#d4af37' : '#999'}
                  strokeWidth="0.5"
                  style={{ cursor: 'pointer' }}
                />
                {isInArea && (
                  <text
                    x={target.x}
                    y={target.y - 3}
                    fontSize="2"
                    fill="#d4af37"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {target.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="targeting-hint">
          Click to set target position
        </div>
      </div>

      {/* Affected targets */}
      <div className="affected-targets">
        <div className="targets-label">Affected Targets ({selectedTargets.length})</div>
        <div className="targets-list">
          {selectedTargets.length === 0 ? (
            <p className="no-targets">No targets selected</p>
          ) : (
            selectedTargets.map(targetId => (
              <div key={targetId} className="target-item">
                Target {targetId}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="targeting-actions">
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="confirm-btn"
          onClick={() => onConfirm({ position: targetPosition, targets: selectedTargets })}
          disabled={selectedTargets.length === 0}
        >
          Cast Spell
        </button>
      </div>
    </div>
  );
}
