import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRY = '24h';
const BCRYPT_ROUNDS = 10;

export interface TokenPayload {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(
    { id: payload.id, username: payload.username, email: payload.email, role: payload.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    // Bug 7 fix: old tokens issued before the role upgrade won't have a role field
    if (!decoded.role) {
      decoded.role = 'RESTAURANT_OWNER';
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function authenticateRequest(request: NextRequest): TokenPayload | null {
  // Check Authorization header first, then fall back to cookie
  const token = getTokenFromRequest(request) || request.cookies.get('token')?.value || null;
  if (!token) return null;
  return verifyToken(token);
}
