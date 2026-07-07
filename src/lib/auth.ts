import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start with no secret.');
}
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
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { isStaff?: boolean };
    if (decoded.isStaff) return null;
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

// ─── Staff Authentication ─────────────────────────────────────

export interface StaffTokenPayload {
  staffId: string;
  ownerId: string;
  name: string;
  role: string; // MANAGER | WAITER | CHEF | CASHIER
}

export function generateStaffToken(payload: StaffTokenPayload): string {
  return jwt.sign(
    { staffId: payload.staffId, ownerId: payload.ownerId, name: payload.name, role: payload.role, isStaff: true },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as StaffTokenPayload & { isStaff?: boolean };
    if (!decoded.isStaff) return null;
    return { staffId: decoded.staffId, ownerId: decoded.ownerId, name: decoded.name, role: decoded.role };
  } catch {
    return null;
  }
}

export function authenticateStaffRequest(request: NextRequest): StaffTokenPayload | null {
  const token = getTokenFromRequest(request) || request.cookies.get('staffToken')?.value || null;
  if (!token) return null;
  return verifyStaffToken(token);
}

/**
 * Authenticate either an owner OR a staff member from the same request.
 * Returns { type: 'owner', user } or { type: 'staff', staff } or null.
 */
export function authenticateAnyRequest(request: NextRequest): 
  | { type: 'owner'; user: TokenPayload }
  | { type: 'staff'; staff: StaffTokenPayload }
  | null {
  const token = getTokenFromRequest(request) || request.cookies.get('token')?.value || request.cookies.get('staffToken')?.value || null;
  if (!token) return null;

  // Try owner token first
  const ownerPayload = verifyToken(token);
  if (ownerPayload) return { type: 'owner', user: ownerPayload };

  // Try staff token
  const staffPayload = verifyStaffToken(token);
  if (staffPayload) return { type: 'staff', staff: staffPayload };

  return null;
}
