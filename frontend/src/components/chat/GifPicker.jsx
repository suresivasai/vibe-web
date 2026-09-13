import { useEffect, useState } from 'react'

const GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs/trending?limit=18&rating=pg-13'

export default function GifPicker({ onSelect, onClose }) {
  const [gifs, setGifs] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const key = import.meta.env.VITE_GIPHY_API_KEY
    if (!key) {
      setStatus('missing-key')
      return
    }
    fetch(`${GIPHY_ENDPOINT}&api_key=${encodeURIComponent(key)}`)
      .then((response) => {
        if (!response.ok) throw new Error('GIF request failed')
        return response.json()
      })
      .then((payload) => {
        setGifs(payload.data || [])
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-2xl border border-white/10 bg-[#171a1c]/98 p-3 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold text-white">Send a GIF</p>
          <p className="text-[10px] text-text-muted-dark">Keep it light and respectful</p>
        </div>
        <button type="button" onClick={onClose} className="text-xs text-text-muted-dark hover:text-white">Close</button>
      </div>
      {status === 'missing-key' && (
        <p className="rounded-xl bg-white/[0.04] p-4 text-xs leading-relaxed text-text-secondary-dark">
          Add <span className="font-semibold text-primary-300">VITE_GIPHY_API_KEY</span> to the frontend environment to enable GIF search.
        </p>
      )}
      {status === 'error' && <p className="p-4 text-xs text-danger">GIFs are unavailable right now. Try again later.</p>}
      {status === 'loading' && <p className="p-4 text-xs text-text-secondary-dark">Loading GIFs...</p>}
      {status === 'ready' && (
        <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
          {gifs.map((gif) => {
            const image = gif.images?.fixed_width_small || gif.images?.downsized_small
            if (!image?.url) return null
            return (
              <button key={gif.id} type="button" onClick={() => onSelect(image.url)} className="aspect-square overflow-hidden rounded-xl bg-black/20 hover:ring-2 hover:ring-primary">
                <img src={image.url} alt={gif.title || 'GIF'} loading="lazy" className="h-full w-full object-cover" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
