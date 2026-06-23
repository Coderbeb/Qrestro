import QRCode from 'qrcode';

export async function generateQRCodeDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 400,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

export async function generateQRCodeSVG(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
  });
}

/**
 * Builds the customer-facing order URL.
 * Priority: NEXT_PUBLIC_APP_URL env var → runtime host from request headers.
 * Pass `requestHost` (e.g. from `request.headers.get('host')`) so the
 * correct domain is used even when the env variable is not set.
 */
export function buildOrderUrl(ownerId: string, tableNumber: number, requestHost?: string | null): string {
  // 1. Explicit env variable (set this in Vercel project settings)
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/order/${ownerId}/${tableNumber}`;
  }

  // 2. Derive from the incoming request host header at runtime
  if (requestHost) {
    const protocol = requestHost.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${requestHost}/order/${ownerId}/${tableNumber}`;
  }

  // 3. Fallback to env variable as-is (may be localhost in dev)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/order/${ownerId}/${tableNumber}`;
}
