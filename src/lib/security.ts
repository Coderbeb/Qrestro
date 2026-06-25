import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export function getTableSignature(ownerId: string, tableNumber: number): string {
  const secret = process.env.JWT_SECRET || 'default-fallback-only-in-dev';
  return crypto
    .createHmac('sha256', secret)
    .update(`${ownerId}:${tableNumber}`)
    .digest('hex')
    .slice(0, 16);
}

export function generateSessionToken(tableId: string, updatedAt: Date): string {
  const secret = process.env.JWT_SECRET || 'default-fallback-only-in-dev';
  return jwt.sign(
    { tableId, tableUpdatedAt: updatedAt.getTime() },
    secret,
    { expiresIn: '12h' } // Sessions expire after 12 hours max
  );
}

export function verifySessionToken(token: string, currentUpdatedAt: Date): boolean {
  try {
    const secret = process.env.JWT_SECRET || 'default-fallback-only-in-dev';
    const decoded = jwt.verify(token, secret) as { tableId: string; tableUpdatedAt: number };
    
    // Compare tableUpdatedAt (rounded to seconds to prevent database roundtrip drift issues)
    const tokenTime = Math.floor(decoded.tableUpdatedAt / 1000);
    const tableTime = Math.floor(currentUpdatedAt.getTime() / 1000);
    
    return tokenTime === tableTime;
  } catch {
    return false;
  }
}
