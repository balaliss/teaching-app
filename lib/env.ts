/**
 * Small helpers for reading environment configuration. Nothing here is imported by
 * client components, so every value stays server-side.
 */

function optional(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() !== '' ? value.trim() : undefined
}

export function required(name: string): string {
  const value = optional(name)
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

export function intOrNull(name: string): number | null {
  const value = optional(name)
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export const env = {
  get anthropicApiKey() {
    return optional('ANTHROPIC_API_KEY')
  },
  get structureModel() {
    return optional('CLAUDE_STRUCTURE_MODEL') ?? 'claude-sonnet-5'
  },
  get gridModel() {
    return optional('CLAUDE_GRID_MODEL') ?? 'claude-opus-5'
  },
  get defaultMonthlyTokenCap() {
    return intOrNull('DEFAULT_MONTHLY_TOKEN_CAP')
  },
  get storageDriver() {
    return (optional('STORAGE_DRIVER') ?? 'disk') as 'disk' | 's3'
  },
  get storageDiskPath() {
    return optional('STORAGE_DISK_PATH') ?? './storage/uploads'
  },
  get maxUploadBytes() {
    return (intOrNull('MAX_UPLOAD_MB') ?? 25) * 1024 * 1024
  },
}
