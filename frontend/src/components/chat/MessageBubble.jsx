// frontend/src/components/chat/MessageBubble.jsx
// Clean message bubbles — own (primary) / theirs (surface)

export default function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="my-4 flex justify-center animate-fade-in">
        <p className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-center text-xs text-zinc-500">
          {message.content}
        </p>
      </div>
    )
  }

  const content = message.is_flagged ? '[message removed]' : message.content
  const isGif =
    !message.is_flagged && /^https:\/\/(media\d*\.)?giphy\.com\//i.test(content)
  const time = message.sent_at
    ? new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`mb-2 flex animate-fade-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
          isOwn
            ? 'rounded-br-md bg-primary text-white'
            : 'rounded-bl-md bg-white/[0.08] text-zinc-100'
        } ${message.is_flagged ? 'italic opacity-70' : ''}`}
      >
        {isGif ? (
          <img
            src={content}
            alt="GIF"
            loading="lazy"
            className="max-h-64 max-w-full rounded-xl object-cover"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        )}
        {time && (
          <p className={`mt-1 text-[10px] ${isOwn ? 'text-white/60' : 'text-zinc-500'}`}>
            {time}
          </p>
        )}
      </div>
    </div>
  )
}
