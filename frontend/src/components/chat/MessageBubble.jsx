// frontend/src/components/chat/MessageBubble.jsx
// Purpose: Sent (right, blue) / received (left, gray) bubbles
// Iteration: 4

export default function MessageBubble({ message, isOwn }) {
  if (message.type === 'system') {
    return (
      <div className="my-5 flex justify-center animate-[slideIn_150ms_ease-out]">
        <p className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-center text-xs text-text-muted-dark">
          {message.content}
        </p>
      </div>
    )
  }

  const content = message.is_flagged ? '[message removed]' : message.content
  const isGif = !message.is_flagged && /^https:\/\/(media\d*\.)?giphy\.com\//i.test(content)
  const time = message.sent_at
    ? new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 animate-[slideIn_150ms_ease-out]`}
    >
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${
          isOwn
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-gray-200 dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark rounded-bl-md'
        } ${message.is_flagged ? 'italic opacity-70' : ''}`}
      >
        {isGif ? (
          <img src={content} alt="Shared GIF" loading="lazy" className="max-h-64 max-w-full rounded-xl object-cover" />
        ) : (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        )}
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? 'text-white/70' : 'text-text-secondary-light dark:text-text-secondary-dark'
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  )
}
