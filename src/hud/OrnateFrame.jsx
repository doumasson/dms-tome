/**
 * Reusable SVG ornate corner brackets for any panel.
 * Renders as an absolutely-positioned SVG overlay.
 * Props: size (corner length), stroke (color), weight (stroke width)
 */
export default function OrnateFrame({ size = 16, stroke = '#c9a84c', weight = 2, jeweled = true }) {
  const r = jeweled ? weight + 1 : 0
  const ir = jeweled ? r * 0.4 : 0
  const s = size
  const offset = -(weight + 1)

  const corner = (transform) => (
    <svg
      style={{ position: 'absolute', ...transform, pointerEvents: 'none', zIndex: 2 }}
      width={s} height={s} viewBox={`0 0 ${s} ${s}`}
    >
      <path
        d={`M0,${s} L0,${weight + 1} Q0,0 ${weight + 1},0 L${s},0`}
        fill="none" stroke={stroke} strokeWidth={weight}
      />
      {jeweled && <>
        <circle cx={weight} cy={weight} r={r} fill={stroke} />
        <circle cx={weight} cy={weight} r={ir} fill="#08060c" />
      </>}
    </svg>
  )

  return <>
    {corner({ top: `${offset}px`, left: `${offset}px` })}
    {corner({ top: `${offset}px`, right: `${offset}px`, transform: 'scaleX(-1)' })}
    {corner({ bottom: `${offset}px`, left: `${offset}px`, transform: 'scaleY(-1)' })}
    {corner({ bottom: `${offset}px`, right: `${offset}px`, transform: 'scale(-1)' })}
  </>
}
