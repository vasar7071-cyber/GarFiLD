import React, { useEffect, useRef } from 'react'

function groupMessages(messages: any[]) {
  if (!messages) return [];
  const groups: any[] = [];
  let cur: any = null;
  for (const m of messages) {
    const time = new Date(m.createdAt).getTime();
    if (!cur || cur.authorId !== m.authorId || (time - cur.lastTime) > 5 * 60 * 1000) {
      cur = { authorId: m.authorId, lastTime: time, items: [m] };
      groups.push(cur);
    } else {
      cur.items.push(m);
      cur.lastTime = time;
    }
  }
  return groups;
}

export default function MessageList({ messages, onRetry }: { messages: any[], onRetry?: (m:any)=>void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groups = groupMessages(messages || []);

  useEffect(() => {
    // scroll to bottom when messages change (messages are chronological: oldest -> newest)
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-gray-50">
      {groups.map((g, idx) => (
        <div key={idx} className="mb-4">
          <div className="text-xs text-gray-500 mb-2">{g.authorId}</div>
          <div className="space-y-2">
            {g.items.map((m: any) => (
              <div key={m.id} className={`p-3 rounded ${m.status === 'failed' ? 'border border-red-300' : 'bg-white'} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-800">{m.content}</div>
                  {m.status === 'sending' && <div className="text-xs text-gray-500 ml-2">Sending…</div>}
                  {m.status === 'failed' && <button onClick={() => onRetry && onRetry(m)} className="text-xs text-red-600 ml-2">Retry</button>}
                </div>
                <div className="text-xs text-gray-400 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
