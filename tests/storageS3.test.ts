import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { AddressInfo } from 'node:net'

/**
 * Exercises the S3 driver against a stub S3-compatible endpoint. This is the
 * code path a Vercel + R2/S3 deployment depends on, so it is worth proving that
 * the client is configured correctly (path-style addressing, signed requests,
 * byte-exact round trip) without needing real cloud credentials.
 */

const objects = new Map<string, { body: Buffer; contentType?: string }>()
const requests: Array<{ method: string; url: string; authorization?: string }> = []

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk) => chunks.push(chunk as Buffer))
    request.on('end', () => {
      requests.push({
        method: request.method ?? '',
        url: request.url ?? '',
        authorization: request.headers.authorization,
      })

      // Path-style addressing: /<bucket>/<key...>. The SDK appends an ?x-id
      // marker that is not part of the object key.
      const path = (request.url ?? '').split('?')[0]
      const key = decodeURIComponent(path.replace(/^\/[^/]+\//, ''))

      if (request.method === 'PUT') {
        objects.set(key, {
          body: Buffer.concat(chunks),
          contentType: request.headers['content-type'],
        })
        response.writeHead(200, { ETag: '"stub"' }).end()
        return
      }

      if (request.method === 'GET') {
        const stored = objects.get(key)
        if (!stored) {
          response.writeHead(404).end('<Error><Code>NoSuchKey</Code></Error>')
          return
        }
        response
          .writeHead(200, {
            'Content-Length': String(stored.body.byteLength),
            'Content-Type': stored.contentType ?? 'application/octet-stream',
          })
          .end(stored.body)
        return
      }

      if (request.method === 'DELETE') {
        objects.delete(key)
        response.writeHead(204).end()
        return
      }

      response.writeHead(405).end()
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`

  process.env.STORAGE_DRIVER = 's3'
  process.env.S3_BUCKET = 'teaching-app-test'
  process.env.S3_ENDPOINT = baseUrl
  process.env.S3_ACCESS_KEY_ID = 'test-access-key'
  process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key'
  delete process.env.S3_REGION
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('S3 storage driver', () => {
  it('is the driver selected by STORAGE_DRIVER=s3', async () => {
    const { storage } = await import('@/lib/storage')
    const { s3Driver } = await import('@/lib/storage/s3')
    expect(storage()).toBe(s3Driver)
  })

  it('round-trips a file byte-for-byte', async () => {
    const { s3Driver } = await import('@/lib/storage/s3')
    // A PDF is binary; a UTF-8 round trip would hide corruption.
    const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0xfe, 0x0a, 0x80])

    await s3Driver.put('curricula/user-1/te.pdf', bytes, 'application/pdf')
    const readBack = await s3Driver.get('curricula/user-1/te.pdf')

    expect(readBack.equals(bytes)).toBe(true)
    expect(objects.get('curricula/user-1/te.pdf')?.contentType).toBe('application/pdf')
  })

  it('addresses the bucket by path and signs the request', async () => {
    const put = requests.find((r) => r.method === 'PUT')
    expect(put?.url.split('?')[0]).toBe('/teaching-app-test/curricula/user-1/te.pdf')
    // R2 and MinIO both require SigV4; an unsigned request would 403 in production.
    expect(put?.authorization).toMatch(/^AWS4-HMAC-SHA256 /)
  })

  it('deletes a file', async () => {
    const { s3Driver } = await import('@/lib/storage/s3')
    await s3Driver.put('curricula/user-1/gone.pdf', Buffer.from('bye'), 'application/pdf')
    await s3Driver.delete('curricula/user-1/gone.pdf')

    expect(objects.has('curricula/user-1/gone.pdf')).toBe(false)
    await expect(s3Driver.get('curricula/user-1/gone.pdf')).rejects.toThrow()
  })

  it('fails loudly when a required credential is missing', async () => {
    const { resetS3Client, s3Driver } = await import('@/lib/storage/s3')
    const saved = process.env.S3_SECRET_ACCESS_KEY
    delete process.env.S3_SECRET_ACCESS_KEY
    resetS3Client()

    await expect(
      s3Driver.put('curricula/user-1/nope.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toThrow(/S3_SECRET_ACCESS_KEY/)

    process.env.S3_SECRET_ACCESS_KEY = saved
    resetS3Client()
  })
})
