/**
 * S3-compatible driver: STORAGE_DRIVER=s3, for Cloudflare R2 or AWS S3. Path-style
 * addressing works unconfigured on both, and lets the driver stay bucket-name-agnostic.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { required } from '@/lib/env'
import type { StorageDriver } from '@/lib/storage'

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() !== '' ? value.trim() : undefined
}

let client: S3Client | undefined

function getClient(): S3Client {
  if (client) return client

  const endpoint = optionalEnv('S3_ENDPOINT')
  client = new S3Client({
    // R2 ignores region, but the SDK still requires a value; AWS S3 needs the real one.
    region: optionalEnv('S3_REGION') ?? (endpoint ? 'auto' : 'us-east-1'),
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    },
  })
  return client
}

/** Test-only: forces the next call to rebuild the client from current env vars. */
export function resetS3Client(): void {
  client = undefined
}

async function readBody(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export const s3Driver: StorageDriver = {
  async put(key, bytes, contentType) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: required('S3_BUCKET'),
        Key: key,
        Body: bytes,
        ContentType: contentType,
        ContentLength: bytes.byteLength,
      }),
    )
  },

  async get(key) {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: required('S3_BUCKET'), Key: key }),
    )
    if (!result.Body) throw new Error(`Object not found: ${key}`)
    return readBody(result.Body)
  },

  async delete(key) {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: required('S3_BUCKET'), Key: key }),
    )
  },
}
