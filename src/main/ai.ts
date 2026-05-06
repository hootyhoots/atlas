import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '../shared/types'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 2048

const SYSTEM_TEXT = `You are an AI assistant built into Atlas, a web browser. You help users understand web content, answer questions, and assist with browsing tasks. Be concise and helpful. When you have access to page content, use it to give context-aware answers.`

let client: Anthropic | null = null
let activeKey: string | undefined = undefined

function getClient(apiKey?: string): Anthropic {
  if (!client || apiKey !== activeKey) {
    activeKey = apiKey
    client = new Anthropic({ apiKey })
  }
  return client
}

interface Memory {
  url: string
  title: string
  snippet: string
  timestamp: number
}

export async function streamChat(
  messages: ChatMessage[],
  pageContent: string | null,
  apiKey: string | undefined,
  memories: Memory[],
  onChunk: (text: string) => void
): Promise<void> {
  const system: Anthropic.Messages.TextBlockParam[] = [
    {
      type: 'text',
      text: SYSTEM_TEXT,
      cache_control: { type: 'ephemeral' },
    },
  ]

  if (memories.length > 0) {
    const top10 = memories.slice(0, 10)
    const memText = 'Recent pages you\'ve visited (browser memory):\n' +
      top10.map(m => `- ${m.title} (${m.url}): ${m.snippet}`).join('\n')
    system.push({
      type: 'text',
      text: memText,
      cache_control: { type: 'ephemeral' },
    })
  }

  if (pageContent) {
    system.push({
      type: 'text',
      text: `Current page content:\n\n${pageContent.slice(0, 10000)}`,
      cache_control: { type: 'ephemeral' },
    })
  }

  const stream = getClient(apiKey).messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })

  stream.on('text', onChunk)
  await stream.finalMessage()
}
