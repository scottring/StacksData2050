import Anthropic from '@anthropic-ai/sdk'

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('ANTHROPIC_API_KEY is set but malformed')
  }
  return new Anthropic({ apiKey })
}

export const EXTRACTION_MODEL = 'claude-sonnet-4-6'
