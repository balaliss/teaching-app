import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

let cached: Anthropic | null = null

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'Claude has not been set up on this site yet, so nothing can be written. Whoever installed ' +
        'this needs to add an ANTHROPIC_API_KEY.',
    )
    this.name = 'MissingApiKeyError'
  }
}

/** The single shared server-side client. Never imported by a client component. */
export function anthropic(): Anthropic {
  const apiKey = env.anthropicApiKey
  if (!apiKey) throw new MissingApiKeyError()
  if (!cached) cached = new Anthropic({ apiKey })
  return cached
}

/** Pulls the first tool_use block matching `name` out of a message. */
export function toolResult<T>(
  message: { content: Array<{ type: string; name?: string; input?: unknown }> },
  name: string,
): T | null {
  for (const block of message.content) {
    if (block.type === 'tool_use' && block.name === name) return block.input as T
  }
  return null
}
