import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;
    
    // Prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    const filePath = join(process.cwd(), 'public', 'uploads', filename);

    if (!existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving upload:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
