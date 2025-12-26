import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (socket) return socket;
  socket = io(API_BASE, { auth: { token: `Bearer ${token}` } });
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
