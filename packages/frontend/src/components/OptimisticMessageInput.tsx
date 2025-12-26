import React, { useState } from 'react'
import { getSocket } from '../socket'

type Props = {
  channelId: string
  user?: any
  onSent: (tempMsg: any) => void
  onConfirm: (tempId: string, serverMsg: any) => void
  onFail: (tempId: string) => void
}

export default function OptimisticMessageInput({ channelId, user, onSent, onConfirm, onFail }: Props) {
  const [text, setText] = useState('')

  function genTempId() {
    return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function send(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!text.trim()) return
    const id = genTempId()
    const temp = {
      id,
      channelId,
      content: text,
      author: { id: user?.id || 'me', name: user?.name || 'You' },
      createdAt: new Date().toISOString(),
      status: 'sending'
    }
    onSent(temp)
    const s = getSocket()
    s?.emit('message:create', { channelId, content: text }, (ack: any) => {
      if (ack && ack.ok) {
        onConfirm(id, ack.data)
      } else {
        onFail(id)
      }
    })
    setText('')
  }

  return (
    <form onSubmit={send} className="px-4 py-3 border-t bg-white">
      <div className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Message #general" />
        <button className="px-4 py-2 bg-indigo-600 text-white rounded" type="submit">Send</button>
      </div>
    </form>
  )
}
