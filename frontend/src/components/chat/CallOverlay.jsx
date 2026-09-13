import { useEffect, useRef, useState } from 'react'

function StreamVideo({ stream, muted = false, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null
  }, [stream])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  )
}

function StreamAudio({ stream }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null
  }, [stream])

  return <audio ref={ref} autoPlay />
}

export default function CallOverlay({
  stranger,
  status,
  mode,
  error,
  localStream,
  remoteStream,
  incomingCall,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onClearError,
}) {
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const active = ['outgoing', 'connecting', 'connected'].includes(status)

  if (incomingCall) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101214]/85 backdrop-blur-md p-5">
        <div className="w-full max-w-sm card-surface p-7 text-center shadow-card">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/20 text-accent-400 flex items-center justify-center text-2xl font-display font-bold">
            {(stranger?.display_name || incomingCall.from?.display_name || '?')[0].toUpperCase()}
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-text-muted-dark font-semibold">Incoming {incomingCall.mode} call</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">{incomingCall.from?.display_name || stranger?.display_name || 'Stranger'}</h2>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button type="button" onClick={onDecline} className="btn-secondary">Decline</button>
            <button type="button" onClick={onAccept} className="btn-primary">Answer</button>
          </div>
        </div>
      </div>
    )
  }

  if (!active && !error) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101214]/90 backdrop-blur-md p-4 sm:p-8">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#171a1c] shadow-card min-h-[min(78dvh,680px)] flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/40 pointer-events-none" />
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted-dark font-semibold">{mode || 'Voice'} call</p>
            <h2 className="mt-1 font-display text-lg font-semibold">{stranger?.display_name || 'Stranger'}</h2>
          </div>
          <span className="text-xs text-accent-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {status === 'connected' ? 'Connected' : 'Connecting'}
          </span>
        </div>

        <div className="relative flex-1 flex items-center justify-center p-5 bg-black/20">
          {mode === 'video' ? (
            <>
              <StreamVideo stream={remoteStream} className="w-full h-full min-h-[320px] max-h-[58dvh] object-cover rounded-xl bg-black" />
              <div className="absolute right-8 bottom-8 w-28 sm:w-40 aspect-[3/4] overflow-hidden rounded-xl border border-white/20 bg-black shadow-lg">
                <StreamVideo stream={localStream} muted className="w-full h-full object-cover" />
                {!localStream && <span className="absolute inset-0 grid place-items-center text-xs text-white/50">Camera off</span>}
              </div>
            </>
          ) : (
            <>
              <StreamAudio stream={remoteStream} />
              <div className="w-28 h-28 rounded-3xl bg-primary flex items-center justify-center text-4xl font-display font-bold text-[#151719] shadow-glow">
                {(stranger?.display_name || '?')[0].toUpperCase()}
              </div>
            </>
          )}
          {status !== 'connected' && <p className="absolute bottom-6 text-sm text-white/60">Waiting for the other person...</p>}
          {status === 'connected' && <p className="absolute bottom-6 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs text-accent-200">Encrypted peer-to-peer connection</p>}
        </div>

        {error && (
          <button type="button" onClick={onClearError} className="relative mx-5 mt-4 rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-left text-sm text-red-200">
            {error}
          </button>
        )}

        <div className="relative flex items-center justify-center gap-3 px-5 py-5 border-t border-white/10">
          <button type="button" onClick={() => setMuted(onToggleMute())} className={`min-h-touch min-w-touch rounded-full border ${muted ? 'border-danger bg-danger/20 text-red-200' : 'border-white/10 bg-white/5 text-white'} px-4 text-sm`}>
            {muted ? 'Unmute' : 'Mute'}
          </button>
          {mode === 'video' && (
            <button type="button" onClick={() => setCameraOff(onToggleCamera())} className={`min-h-touch min-w-touch rounded-full border ${cameraOff ? 'border-danger bg-danger/20 text-red-200' : 'border-white/10 bg-white/5 text-white'} px-4 text-sm`}>
              {cameraOff ? 'Camera on' : 'Camera off'}
            </button>
          )}
          <button type="button" onClick={onEnd} className="min-h-touch rounded-full bg-danger px-6 text-sm font-semibold text-white shadow-lg shadow-danger/20">
            End call
          </button>
        </div>
      </div>
    </div>
  )
}