import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Unified file upload utility.
 * Delegates storage to either the local VPS filesystem or saves the file as a Base64 data URL
 * inside the database, depending on the environment configuration.
 *
 * @param file - The uploaded file object
 * @returns The URL or Base64 string of the uploaded file
 */
export async function uploadFile(file: File): Promise<string> {
  // Read provider from environment. If running on Vercel, fallback to 'database' (Base64 data URL) since the filesystem is read-only.
  const isVercel = process.env.VERCEL === '1';
  const provider = process.env.STORAGE_PROVIDER || (isVercel ? 'database' : 'local');

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (provider === 'database') {
    // Convert to Base64 data URL to store directly in the database
    return `data:${file.type};base64,${buffer.toString('base64')}`;
  }

  if (provider === 'local') {
    // Generate a unique, safe filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${uniqueSuffix}-${safeName}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads');

    // Ensure upload folder exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // Folder already exists or cannot be created
    }

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the relative public path
    return `/uploads/${filename}`;
  }

  throw new Error(`Unsupported storage provider: "${provider}"`);
}
