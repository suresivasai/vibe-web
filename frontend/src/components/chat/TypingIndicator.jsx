// frontend/src/components/chat/TypingIndicator.jsx
// Purpose: Animated three-dot typing bubble
// Iteration: 4

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 items-center">
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
