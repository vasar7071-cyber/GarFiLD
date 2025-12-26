import React, { useState } from 'react'
import { getSocket } from '../socket'

export default function MessageInput({ channelId, onSent }: { channelId: string, onSent?: (msg: any) => void }) {
  const [text, setText] = useState('')

  async function send() {
    if (!text.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('message:create', { channelId, content: text }, (ack: any) => {
        if (ack && ack.ok) {
          onSent && onSent(ack.data);
        } else {
          alert(ack?.error?.message || 'Failed to send');
        }
      });
    }
    setText('');
  }

  return (
    <div className="p-4 border-t bg-white flex items-center gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" className="flex-1 px-3 py-2 border rounded" />
      <button onClick={send} className="px-4 py-2 bg-indigo-600 text-white rounded">Send</button>
    </div>
  )
}
