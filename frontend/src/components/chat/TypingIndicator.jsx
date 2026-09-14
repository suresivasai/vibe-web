// frontend/src/components/chat/TypingIndicator.jsx

export default function TypingIndicator() {
  return (
    <div className="mb-2 flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/[0.08] px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
      </div>
    </div>
  )
}
