import Anthropic from '@anthropic-ai/sdk'

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  console.log('[Anthropic] Using API key:', apiKey.slice(0, 15) + '...')
  return new Anthropic({ apiKey })
}

export const EXTRACTION_MODEL = 'claude-sonnet-4-5-20250929'
