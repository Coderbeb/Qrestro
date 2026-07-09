import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.29.23', '192.168.29.23:3000'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
