// frontend/src/components/shared/Avatar.jsx
// Purpose: Google photo or colored initials circle
// Iteration: 6

const COLORS = [
  '#378ADD', '#1D9E75', '#E24B4A', '#EF9F27', '#7C5CFC', '#0EA5E9',
]

function colorFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?'
}

export default function Avatar({ name, url, size = 40 }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || 'avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: colorFor(name),
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
