/**
 * Local filesystem driver: STORAGE_DRIVER=disk, the default for Docker and
 * single-machine setups where there's a persistent volume to write into.
 */
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '@/lib/env'
import type { StorageDriver } from '@/lib/storage'

function resolvePath(key: string): string {
  const relative = path.normalize(key)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid storage key: ${key}`)
  }
  return path.join(env.storageDiskPath, relative)
}

export const diskDriver: StorageDriver = {
  async put(key, bytes) {
    const filePath = resolvePath(key)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, bytes)
  },

  async get(key) {
    return readFile(resolvePath(key))
  },

  async delete(key) {
    try {
      await unlink(resolvePath(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  },
}
