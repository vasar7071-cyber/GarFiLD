import request from 'supertest';
import { app, prisma } from '../app';
import { createAccessToken } from '../auth';

describe('servers endpoints', () => {
  it('creates a server (owner flows)', async () => {
    // mock prisma server.create to avoid DB
    const fakeServer = { id: 'srv-1', name: 'Test Server', ownerId: 'user-1', visibility: 'private', createdAt: new Date() } as any;
    const spy = jest.spyOn(prisma.server, 'create').mockResolvedValue(fakeServer);

    const token = createAccessToken({ userId: 'user-1' });
    const res = await request(app).post('/api/servers').set('Authorization', `Bearer ${token}`).send({ name: 'Test Server' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe('srv-1');
    spy.mockRestore();
  });
});
