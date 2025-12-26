import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createAccessToken, createRefreshToken, hashPassword, comparePassword, verifyRefreshToken, verifyAccessToken, authMiddleware } from './auth';

export const prisma = new PrismaClient();
export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

function calcRefreshExpiryMs(): number {
  // default 30 days — could parse REFRESH_TOKEN_EXP if needed
  return 30 * 24 * 60 * 60 * 1000;
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Email and password required' } });
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(400).json({ ok: false, error: { code: 'USER_EXISTS', message: 'User already exists' } });
  const hashed = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name, password: hashed } });
  const accessToken = createAccessToken({ userId: user.id });
  const refreshToken = createRefreshToken({ userId: user.id });
  const expiresAt = new Date(Date.now() + calcRefreshExpiryMs());
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax' });
  res.status(201).json({ ok: true, data: { user, accessToken } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
  const accessToken = createAccessToken({ userId: user.id });
  const refreshToken = createRefreshToken({ userId: user.id });
  const expiresAt = new Date(Date.now() + calcRefreshExpiryMs());
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true, data: { accessToken, user } });
});

app.post('/api/auth/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Missing refresh token' } });
  try {
    const payload: any = verifyRefreshToken(token);
    const row = await prisma.refreshToken.findUnique({ where: { token } });
    if (!row || row.userId !== payload.userId) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid refresh token' } });
    // rotate refresh token: delete old, create new
    await prisma.refreshToken.delete({ where: { token } });
    const newRefreshToken = createRefreshToken({ userId: payload.userId });
    const expiresAt = new Date(Date.now() + calcRefreshExpiryMs());
    await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: payload.userId, expiresAt } });
    const accessToken = createAccessToken({ userId: payload.userId });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid refresh token' } });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  res.clearCookie('refreshToken');
  res.status(204).send();
});

app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
  const token = auth.split(' ')[1];
  try {
    const payload: any = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ ok: true, data: { user } });
  } catch (err) {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
  }
});

// Servers & Channels endpoints

// Create server
app.post('/api/servers', authMiddleware, async (req, res) => {
  const { name, description, visibility } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Server name required' } });
  const userId = (req as any).user.userId;
  const server = await prisma.server.create({ data: { name, description, visibility: visibility || 'private', ownerId: userId } });
  const ownerRole = await prisma.role.create({ data: { name: 'Owner', serverId: server.id, permissions: [] } });
  await prisma.serverMember.create({ data: { serverId: server.id, userId, roleId: ownerRole.id } });
  res.status(201).json({ ok: true, data: server });
});

// List servers available to user
app.get('/api/servers', authMiddleware, async (req, res) => {
  const userId = (req as any).user.userId;
  const servers = await prisma.server.findMany({ where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } });
  res.json({ ok: true, data: servers });
});

// Get server
app.get('/api/servers/:serverId', authMiddleware, async (req, res) => {
  const { serverId } = req.params;
  const server = await prisma.server.findUnique({ where: { id: serverId }, include: { channels: true, roles: true } });
  if (!server) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Server not found' } });
  res.json({ ok: true, data: server });
});

// Create channel (only owner for now)
app.post('/api/servers/:serverId/channels', authMiddleware, async (req, res) => {
  const { serverId } = req.params;
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Channel name required' } });
  const userId = (req as any).user.userId;
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Server not found' } });
  if (server.ownerId !== userId) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only server owner can create channels' } });
  const channel = await prisma.channel.create({ data: { name, type: type || 'text', serverId } });
  res.status(201).json({ ok: true, data: channel });
});

// List channels
app.get('/api/servers/:serverId/channels', authMiddleware, async (req, res) => {
  const { serverId } = req.params;
  const userId = (req as any).user.userId;
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Server not found' } });
  const member = await prisma.serverMember.findFirst({ where: { serverId, userId } });
  if (!member && server.ownerId !== userId) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not a member of server' } });
  const channels = await prisma.channel.findMany({ where: { serverId } });
  res.json({ ok: true, data: channels });
});

// Add server member (by owner)
app.post('/api/servers/:serverId/members', authMiddleware, async (req, res) => {
  const { serverId } = req.params;
  const { userId } = req.body;
  const actorId = (req as any).user.userId;
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Server not found' } });
  if (server.ownerId !== actorId) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only owner can add members' } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
  const exists = await prisma.serverMember.findFirst({ where: { serverId, userId } });
  if (exists) return res.status(400).json({ ok: false, error: { code: 'ALREADY_MEMBER', message: 'User already member' } });
  const member = await prisma.serverMember.create({ data: { serverId, userId } });
  res.status(201).json({ ok: true, data: member });
});

// Messages CRUD

async function userCanAccessChannel(userId: string, channelId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return false;
  const server = await prisma.server.findUnique({ where: { id: channel.serverId } });
  if (!server) return false;
  if (server.ownerId === userId) return true;
  const member = await prisma.serverMember.findFirst({ where: { serverId: server.id, userId } });
  return !!member;
}

// List messages (cursor = message id, returns latest messages)
app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
  const { channelId } = req.params;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  const userId = (req as any).user.userId;
  const okAccess = await userCanAccessChannel(userId, channelId);
  if (!okAccess) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'No access to channel' } });
  const messages = await prisma.message.findMany({ where: { channelId }, orderBy: { createdAt: 'desc' }, take: limit });
  res.json({ ok: true, data: { messages, nextCursor: messages.length ? messages[messages.length - 1].id : null } });
});

// Create message
app.post('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
  const { channelId } = req.params;
  const { content, attachments } = req.body;
  if (!content) return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Content required' } });
  const userId = (req as any).user.userId;
  const okAccess = await userCanAccessChannel(userId, channelId);
  if (!okAccess) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'No access to channel' } });
  const message = await prisma.message.create({ data: { channelId, authorId: userId, content, attachments: attachments || null } });
  // broadcast to room if io is set
  try {
    if ((app as any).io) {
      (app as any).io.to(`channel:${channelId}`).emit('message:new', { ok: true, data: message });
    }
  } catch (e) {
    // ignore
  }
  res.status(201).json({ ok: true, data: message });
});

// Edit message (author only)
app.patch('/api/messages/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Content required' } });
  const userId = (req as any).user.userId;
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Message not found' } });
  if (msg.authorId !== userId) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only author can edit' } });
  const updated = await prisma.message.update({ where: { id }, data: { content, editedAt: new Date() } });
  try { if ((app as any).io) (app as any).io.to(`channel:${updated.channelId}`).emit('message:update', { ok: true, data: updated }); } catch (e) {}
  res.json({ ok: true, data: updated });
});

// Delete message (soft delete)
app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Message not found' } });
  if (msg.authorId !== userId) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Only author can delete' } });
  const deleted = await prisma.message.update({ where: { id }, data: { deleted: true } });
  try { if ((app as any).io) (app as any).io.to(`channel:${deleted.channelId}`).emit('message:delete', { ok: true, data: { id: deleted.id } }); } catch (e) {}
  res.status(204).send();
});

