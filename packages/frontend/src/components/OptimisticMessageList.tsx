import React from 'react'

type Props = {
  messages: any[]
  onRetry?: (tempMsg: any) => void
}

export default function OptimisticMessageList({ messages, onRetry }: Props) {
  return (
    <div className="flex-1 overflow-auto p-4 bg-gray-100">
      {messages.map((m) => (
        <div key={m.id} className="mb-3">
          <div className="text-sm text-gray-600">{m.author?.name} <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString()}</span></div>
          <div className="mt-1">
            <span>{m.content}</span>
            {m.status === 'sending' && <span className="ml-2 text-xs text-gray-500">Sending...</span>}
            {m.status === 'failed' && (
              <span className="ml-2 text-xs text-red-500">Failed <button className="ml-2 underline" onClick={() => onRetry && onRetry(m)}>Retry</button></span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
