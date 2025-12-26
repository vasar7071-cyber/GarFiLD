import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_TOKEN_EXP = process.env.REFRESH_TOKEN_EXP || '30d';

export function createAccessToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
}

export function createRefreshToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXP });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
  const token = auth.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
  }
}
