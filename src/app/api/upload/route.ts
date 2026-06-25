import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Allowed file extensions (must match MIME type) */
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
]);

/** Maximum file size: 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

    // ── Validate MIME type ───────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `Only image files are allowed (JPEG, PNG, WebP, GIF). Received: ${file.type || 'unknown'}`,
        },
      }, { status: 400 });
    }

    // ── Validate file extension ─────────────────────────────────
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `Invalid file extension "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
        },
      }, { status: 400 });
    }

    // ── Validate file size ──────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size (${sizeMB} MB) exceeds the 5 MB limit.`,
        },
      }, { status: 400 });
    }

    const imageUrl = await uploadFile(file);
    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload file' } }, { status: 500 });
  }
}
