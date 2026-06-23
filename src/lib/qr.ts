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

export function buildOrderUrl(ownerId: string, tableNumber: number): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/order/${ownerId}/${tableNumber}`;
}
