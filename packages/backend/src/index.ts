import http from 'http';
import { app, prisma } from './app';
import { Server } from 'socket.io';
import { verifyAccessToken } from './auth';

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

// expose io to app for REST handlers to emit
import { app as expressApp } from './app';
(expressApp as any).io = io;

io.use((socket, next) => {
  try {
    const bearer = (socket.handshake.auth && (socket.handshake.auth as any).token) || '';
    const token = (bearer as string).split(' ')[1];
    if (!token) return next(new Error('UNAUTHENTICATED'));
    const payload: any = verifyAccessToken(token);
    (socket as any).data.user = payload;
    next();
  } catch (err) {
    next(new Error('UNAUTHENTICATED'));
  }
});

io.on('connection', (socket) => {
  const user = (socket as any).data.user;
  console.log('socket connected user:', user);
  socket.emit('connected', { ok: true, data: { user } });

  socket.on('channel:join', async (payload, ack) => {
    try {
      const { channelId } = payload;
      // simple check
      const canAccess = await (async () => {
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) return false;
        const server = await prisma.server.findUnique({ where: { id: channel.serverId } });
        if (!server) return false;
        if (server.ownerId === user.userId) return true;
        const member = await prisma.serverMember.findFirst({ where: { serverId: server.id, userId: user.userId } });
        return !!member;
      })();
      if (!canAccess) return ack ? ack({ ok: false, error: { code: 'FORBIDDEN', message: 'No access to channel' } }) : null;
      socket.join(`channel:${payload.channelId}`);
      socket.to(`channel:${payload.channelId}`).emit('presence:join', { ok: true, data: { user: user.userId } });
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false, error: { code: 'SERVER_ERROR' } });
    }
  });

  socket.on('channel:leave', (payload, ack) => {
    socket.leave(`channel:${payload.channelId}`);
    socket.to(`channel:${payload.channelId}`).emit('presence:leave', { ok: true, data: { user: user.userId } });
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('message:create', async (payload, ack) => {
    try {
      const { channelId, content, attachments } = payload;
      if (!channelId || !content) return ack ? ack({ ok: false, error: { code: 'INVALID_INPUT', message: 'channelId and content required' } }) : null;
      // check access
      const canAccess = await (async () => {
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) return false;
        const server = await prisma.server.findUnique({ where: { id: channel.serverId } });
        if (!server) return false;
        if (server.ownerId === user.userId) return true;
        const member = await prisma.serverMember.findFirst({ where: { serverId: server.id, userId: user.userId } });
        return !!member;
      })();
      if (!canAccess) return ack ? ack({ ok: false, error: { code: 'FORBIDDEN', message: 'No access to channel' } }) : null;
      const message = await prisma.message.create({ data: { channelId, authorId: user.userId, content, attachments: attachments || null } });
      io.to(`channel:${channelId}`).emit('message:new', { ok: true, data: message });
      if (typeof ack === 'function') ack({ ok: true, data: message });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false, error: { code: 'SERVER_ERROR', message: 'Failed to create message' } });
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
