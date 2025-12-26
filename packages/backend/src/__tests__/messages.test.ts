import request from 'supertest';
import { app } from '../app';
import { createAccessToken } from '../auth';
import { prisma } from '../app';

describe('messages endpoints', () => {
  it('creates a message in channel', async () => {
    const fakeMsg = { id: 'msg-1', channelId: 'chan-1', authorId: 'user-1', content: 'hello', createdAt: new Date() } as any;
    const spy = jest.spyOn(prisma.message, 'create').mockResolvedValue(fakeMsg);
    // mock channel and membership
    jest.spyOn(prisma.channel, 'findUnique').mockResolvedValue({ id: 'chan-1', serverId: 'srv-1' } as any);
    jest.spyOn(prisma.server, 'findUnique').mockResolvedValue({ id: 'srv-1', ownerId: 'user-1' } as any);

    const token = createAccessToken({ userId: 'user-1' });
    const res = await request(app).post('/api/channels/chan-1/messages').set('Authorization', `Bearer ${token}`).send({ content: 'hello' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe('msg-1');
    spy.mockRestore();
  });
});
