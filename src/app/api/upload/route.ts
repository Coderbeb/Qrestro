import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file uploaded' } }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error('Error creating upload dir:', err);
    }

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload file' } }, { status: 500 });
  }
}
