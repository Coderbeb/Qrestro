import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipCache = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes to prevent memory leaks
if (typeof global !== 'undefined') {
  const globalAny = global as any;
  if (!globalAny.rateLimitCleanupInterval) {
    globalAny.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of ipCache.entries()) {
        if (now > record.resetTime) {
          ipCache.delete(ip);
        }
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * Checks if a request is rate limited.
 * @param request The NextRequest object
 * @param limit The maximum number of requests allowed in the window
 * @param windowMs The window duration in milliseconds (default: 1 minute)
 * @returns true if the request is rate limited, false otherwise
 */
export function isRateLimited(request: NextRequest, limit: number = 60, windowMs: number = 60000): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '127.0.0.1';

  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record) {
    ipCache.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }

  record.count += 1;
  return record.count > limit;
}
