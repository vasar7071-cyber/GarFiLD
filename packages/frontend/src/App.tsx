import React, { useEffect, useState } from 'react'
import { register, login, me, getServers, getMessages } from './api'
import { connectSocket, disconnectSocket, getSocket } from './socket'
import ServerList from './components/ServerList'
import ChannelList from './components/ChannelList'
import OptimisticMessageList from './components/OptimisticMessageList'
import OptimisticMessageInput from './components/OptimisticMessageInput'

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [user, setUser] = useState<any>(null);
  const [server, setServer] = useState<any | null>(null);
  const [channel, setChannel] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('accessToken', token);
      connectSocket(token).on('connect', () => console.log('socket connected'));
      const s = getSocket();
      s?.on('message:new', (payload: any) => {
        if (payload && payload.data && payload.data.channelId === channel?.id) {
          setMessages((prev) => {
            if (prev.some(ms => ms.id === payload.data.id)) return prev;
            return [...prev, payload.data];
          });
        }
      });
      s?.on('message:update', (payload: any) => {
        setMessages((m) => m.map(ms => ms.id === payload.data.id ? payload.data : ms));
      });
      s?.on('message:delete', (payload: any) => {
        setMessages((m) => m.filter(ms => ms.id !== payload.data.id));
      });
    }
    return () => { disconnectSocket(); }
  }, [token, channel?.id]);

  function handleOptimisticSend(tempMsg: any) {
    setMessages(m => [...m, tempMsg]);
  }

  function handleConfirm(tempId: string, serverMsg: any) {
    setMessages(m => m.map(x => x.id === tempId ? serverMsg : x));
  }

  function handleFail(tempId: string) {
    setMessages(m => m.map(x => x.id === tempId ? { ...x, status: 'failed' } : x));
  }

  function retryMessage(tempMsg: any) {
    setMessages(m => m.map(x => x.id === tempMsg.id ? { ...x, status: 'sending' } : x));
    const s = getSocket();
    s?.emit('message:create', { channelId: tempMsg.channelId, content: tempMsg.content }, (ack: any) => {
      if (ack && ack.ok) {
        setMessages(m => m.map(x => x.id === tempMsg.id ? ack.data : x));
      } else {
        setMessages(m => m.map(x => x.id === tempMsg.id ? { ...x, status: 'failed' } : x));
      }
    });
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    disconnectSocket();
  }

  useEffect(() => {
    if (!channel) return;
    // fetch messages (API returns newest first; normalize to oldest->newest)
    getMessages(channel.id).then((res) => { if (res.ok) setMessages((res.data.messages || []).slice().reverse()); });
    // join socket room
    const s = getSocket();
    s?.emit('channel:join', { channelId: channel.id }, (ack: any) => {
      if (!ack || !ack.ok) console.warn('Failed to join channel', ack);
    });
    return () => { s?.emit('channel:leave', { channelId: channel.id }); }
  }, [channel]);

  useEffect(() => {
    if (!token) return;
    me().then((res) => { if (res.ok) setUser(res.data.user); });
  }, [token]);

  async function handleRegister(e: any) {
    e.preventDefault();
    const res = await register({ name, email, password });
    if (res.ok) {
      setToken(res.data.accessToken);
      localStorage.setItem('accessToken', res.data.accessToken);
    } else {
      alert(res.error?.message || 'Error');
    }
  }

  async function handleLogin(e: any) {
    e.preventDefault();
    const res = await login({ email, password });
    if (res.ok) {
      setToken(res.data.accessToken);
      localStorage.setItem('accessToken', res.data.accessToken);
    } else {
      alert(res.error?.message || 'Error');
    }
  }

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h1>ChatX (skeleton)</h1>
        <div style={{ display: 'flex', gap: 20 }}>
          <form onSubmit={handleRegister} style={{ border: '1px solid #ccc', padding: 10 }}>
            <h3>Register</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <br />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <br />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
            <br />
            <button type="submit">Register</button>
          </form>
          <form onSubmit={handleLogin} style={{ border: '1px solid #ccc', padding: 10 }}>
            <h3>Login</h3>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <br />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
            <br />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <ServerList onSelect={(s) => { setServer(s); setChannel(null); }} />
      <ChannelList server={server} onSelect={(c) => setChannel(c)} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <div>
            <div className="text-sm text-gray-600">{user?.name || 'Anonymous'}</div>
            <div className="text-xs text-gray-400">{user?.email}</div>
          </div>
          <div>
            <button onClick={logout} className="px-3 py-1 bg-red-500 text-white rounded">Logout</button>
          </div>
        </div>

        {channel ? (
          <>
            <div className="px-4 py-2 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">{channel.name}</h3>
            </div>
            <OptimisticMessageList messages={messages} onRetry={retryMessage} />
            <OptimisticMessageInput channelId={channel.id} user={user} onSent={handleOptimisticSend} onConfirm={handleConfirm} onFail={handleFail} />
          </>
        ) : (<div className="p-8">Select a channel to view messages</div>)}
      </div>
    </div>
  )
}
