/**
 * Storage driver selection. `disk` and `s3` sit behind one interface so the rest
 * of the app never branches on STORAGE_DRIVER itself.
 */
import { randomUUID } from 'node:crypto'
import { env } from '@/lib/env'
import { diskDriver } from '@/lib/storage/disk'
import { s3Driver } from '@/lib/storage/s3'

export interface StorageDriver {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
}

export function storage(): StorageDriver {
  return env.storageDriver === 's3' ? s3Driver : diskDriver
}

/** Keys are namespaced by owner so per-teacher isolation holds at the storage layer too. */
export function uploadKey(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  return `curricula/${userId}/${randomUUID()}-${safeName}`
}
