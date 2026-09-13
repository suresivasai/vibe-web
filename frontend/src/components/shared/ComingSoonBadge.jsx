// frontend/src/components/shared/ComingSoonBadge.jsx
// Purpose: Gray overlay badge for video/voice buttons
// Iteration: 6

export default function ComingSoonBadge({ small = false }) {
  if (small) {
    return (
      <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded text-[8px] font-bold bg-gray-500 text-white leading-none">
        SOON
      </span>
    )
  }
  return (
    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/90 text-white leading-none">
      SOON
    </span>
  )
}
