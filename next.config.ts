import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep the container/host-agnostic: `output: standalone` produces a self-contained
  // server bundle for Docker, and is harmless on Vercel.
  output: 'standalone',
  serverExternalPackages: ['unpdf', 'mammoth', 'exceljs', '@prisma/client', 'bcryptjs'],
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
}

export default nextConfig
