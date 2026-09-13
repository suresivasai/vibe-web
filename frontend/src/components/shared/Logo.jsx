// Premium Vibe logo — modern, energetic, Gen-Z
export default function Logo({ size = 36, showWordmark = true, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_15px_rgba(255,112,95,0.45)]"
      >
        <rect width="100" height="100" rx="30" fill="url(#bg-grad)" />
        
        {/* Glow behind logo mark */}
        <circle cx="50" cy="50" r="25" fill="url(#glow)" opacity="0.8" />
        
        {/* V-shape infinity spark */}
        <path
          d="M 28 35 C 35 25, 45 40, 50 55 C 55 70, 75 80, 75 55 C 75 30, 60 20, 50 35 C 40 50, 20 60, 25 35"
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        
        {/* Little sparks */}
        <circle cx="70" cy="30" r="5" fill="#00e5ff" />
        <circle cx="30" cy="70" r="3" fill="#ff007f" />

        <defs>
          <linearGradient id="bg-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#263033" />
            <stop offset="1" stopColor="#111516" />
          </linearGradient>
          
          <linearGradient id="line-grad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff8878" />
            <stop offset="0.5" stopColor="#ff705f" />
            <stop offset="1" stopColor="#7ce4c5" />
          </linearGradient>

          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop stopColor="#ff705f" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff705f" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {showWordmark && (
          <span className="font-display font-extrabold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-primary to-accent-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Vibe
        </span>
      )}
    </div>
  )
}
