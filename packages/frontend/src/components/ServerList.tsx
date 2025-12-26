import React, { useEffect, useState } from 'react';
import { getServers, createServer } from '../api';

export default function ServerList({ onSelect }: { onSelect: (server: any) => void }) {
  const [servers, setServers] = useState<any[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    getServers().then((res) => { if (res.ok) setServers(res.data); });
  }, []);

  async function handleCreate(e: any) {
    e.preventDefault();
    if (!name) return;
    const res = await createServer({ name });
    if (res.ok) {
      setServers((s) => [res.data, ...s]);
      setName('');
    } else {
      alert(res.error?.message || 'Failed');
    }
  }

  return (
    <div className="w-56 border-r bg-white h-full p-4">
      <h4 className="font-semibold mb-3">Servers</h4>
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input className="flex-1 border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="New server" />
        <button className="bg-blue-500 text-white px-3 rounded" type="submit">+</button>
      </form>
      <ul className="space-y-2">
        {servers.map((s) => (
          <li key={s.id}>
            <button onClick={() => onSelect(s)} className="w-full text-left px-2 py-1 rounded hover:bg-gray-100">{s.name}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
