import React, { useEffect, useState } from 'react';
import { getChannels, createChannel } from '../api';

export default function ChannelList({ server, onSelect }: { server: any, onSelect: (channel: any) => void }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!server) return;
    getChannels(server.id).then((res) => { if (res.ok) setChannels(res.data); });
  }, [server]);

  async function handleCreate(e: any) {
    e.preventDefault();
    if (!server || !name) return;
    const res = await createChannel(server.id, { name });
    if (res.ok) {
      setChannels((c) => [res.data, ...c]);
      setName('');
    } else {
      alert(res.error?.message || 'Failed');
    }
  }

  if (!server) return <div className="w-64 p-4">Select a server</div>;

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex-shrink-0">
      <h4 className="text-lg font-semibold mb-2">{server.name}</h4>
      <form onSubmit={handleCreate} className="flex gap-2 mb-3">
        <input className="flex-1 px-2 py-1 border rounded" value={name} onChange={(e) => setName(e.target.value)} placeholder="New channel" />
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" type="submit">Create</button>
      </form>
      <ul className="space-y-2">
        {channels.map((c) => (
          <li key={c.id}><button onClick={() => onSelect(c)} className="w-full text-left px-2 py-1 rounded hover:bg-indigo-50">{c.name}</button></li>
        ))}
      </ul>
    </div>
  )
}
