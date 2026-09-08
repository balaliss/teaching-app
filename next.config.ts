import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `standalone` produces the self-contained server bundle the Docker image
  // copies. It is opt-in because it breaks `next start` (and Vercel builds its
  // own output format anyway) — the Dockerfile sets BUILD_STANDALONE.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  serverExternalPackages: ['unpdf', 'mammoth', 'exceljs', '@prisma/client', 'bcryptjs'],
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
  },
}

export default nextConfig
