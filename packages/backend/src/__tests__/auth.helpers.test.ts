import { hashPassword, comparePassword, createAccessToken, verifyAccessToken } from '../auth';

describe('auth helpers', () => {
  it('hashes and compares passwords', async () => {
    const pwd = 'secret123';
    const hash = await hashPassword(pwd);
    const ok = await comparePassword(pwd, hash);
    expect(ok).toBe(true);
  });

  it('creates and verifies access tokens', () => {
    const token = createAccessToken({ userId: 'user-1' });
    const payload: any = verifyAccessToken(token);
    expect(payload.userId).toBe('user-1');
  });
});
