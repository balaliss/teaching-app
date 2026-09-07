import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `standalone` produces the self-contained server bundle the Dockerfile copies.
  // Vercel builds its own output format, so leave it off there.
  output: process.env.VERCEL ? undefined : 'standalone',
  serverExternalPackages: ['unpdf', 'mammoth', 'exceljs', '@prisma/client', 'bcryptjs'],
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
}

export default nextConfig
