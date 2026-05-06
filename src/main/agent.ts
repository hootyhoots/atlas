import Anthropic from '@anthropic-ai/sdk'
import type { WebContents } from 'electron'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

const SYSTEM = `You are a browser automation agent embedded in the Atlas browser. You control the active web page to complete tasks on behalf of the user.

Rules:
- Always start with a screenshot to see the current page state
- Prefer CSS selectors for clicking; fall back to visible text matching
- After significant actions (form submit, navigation, button click) take another screenshot to verify
- If something fails, try an alternative approach before giving up
- Be concise in explanations — focus on what you're doing, not narrating every step
- When the task is complete, say so clearly`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'screenshot',
    description: 'Capture a screenshot of the current browser page to see its visual state',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_page_info',
    description: 'Get the current page URL, title, and readable text content',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'click',
    description: 'Click an element on the page identified by CSS selector or visible text',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element to click' },
        text: { type: 'string', description: 'Visible text of the element to click (used if no selector)' },
      },
    },
  },
  {
    name: 'type',
    description: 'Type text into the focused or specified input element',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to type' },
        selector: { type: 'string', description: 'CSS selector to focus before typing (optional)' },
        clear: { type: 'boolean', description: 'Clear existing text first (default false)' },
      },
      required: ['text'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate the browser to a URL',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to navigate to (must include https://)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the page to reveal more content',
    input_schema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['down', 'up', 'top', 'bottom'] },
        amount: { type: 'number', description: 'Pixels to scroll (default 400)' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'wait',
    description: 'Wait for page changes to settle after navigation or async actions',
    input_schema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to wait (max 3000)' },
      },
    },
  },
]

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'toolCall'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'toolResult'; id: string; name: string; ok: boolean; text?: string; imageData?: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

let stopped = false

export function stopAgent(): void {
  stopped = true
}

async function execTool(
  name: string,
  input: Record<string, unknown>,
  wc: WebContents,
  navigateFn: (url: string) => void
): Promise<{ text?: string; imageData?: string }> {
  switch (name) {
    case 'screenshot': {
      const img = await wc.capturePage()
      const resized = img.resize({ width: 1280 })
      return { imageData: resized.toPNG().toString('base64') }
    }

    case 'get_page_info': {
      const url = wc.getURL()
      const title = wc.getTitle()
      const content: string = await wc.executeJavaScript(
        'document.body?.innerText?.slice(0, 6000) ?? ""'
      )
      return { text: `URL: ${url}\nTitle: ${title}\n\nContent:\n${content}` }
    }

    case 'click': {
      const { selector, text } = input as { selector?: string; text?: string }
      const result: string = await wc.executeJavaScript(`
        (() => {
          let el
          ${selector
            ? `el = document.querySelector(${JSON.stringify(selector)})`
            : `
              const all = [...document.querySelectorAll('a,button,input[type="submit"],input[type="button"],[role="button"],[role="link"],label,[tabindex]')]
              const t = ${JSON.stringify(text ?? '')}
              el = all.find(e => e.textContent?.trim() === t || e.value === t || e.getAttribute('aria-label') === t || e.getAttribute('placeholder') === t)
            `}
          if (!el) throw new Error(${JSON.stringify(`Element not found: ${selector ?? text}`)})
          el.scrollIntoView({ behavior: 'instant', block: 'center' })
          el.focus?.()
          el.click()
          return 'Clicked: ' + (el.textContent?.trim().slice(0, 80) || el.tagName)
        })()
      `)
      return { text: result }
    }

    case 'type': {
      const { text, selector, clear = false } = input as { text: string; selector?: string; clear?: boolean }
      await wc.executeJavaScript(`
        (() => {
          ${selector
            ? `const t = document.querySelector(${JSON.stringify(selector)}); if (t) { t.focus(); t.click() }`
            : ''}
          const el = document.activeElement
          if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.contentEditable !== 'true')) {
            throw new Error('No editable element is focused')
          }
          const proto = Object.getPrototypeOf(el)
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
          const newVal = ${clear} ? ${JSON.stringify(text)} : ((el.value || '') + ${JSON.stringify(text)})
          if (setter) {
            setter.call(el, newVal)
          } else {
            el.textContent = newVal
          }
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        })()
      `)
      return { text: `Typed "${String(text).slice(0, 40)}${String(text).length > 40 ? '…' : ''}"` }
    }

    case 'navigate': {
      const { url } = input as { url: string }
      navigateFn(url)
      await new Promise(r => setTimeout(r, 2000))
      return { text: `Navigated to ${url}` }
    }

    case 'scroll': {
      const { direction, amount = 400 } = input as { direction: string; amount?: number }
      const scripts: Record<string, string> = {
        down: `window.scrollBy(0, ${amount})`,
        up: `window.scrollBy(0, -${amount})`,
        top: `window.scrollTo(0, 0)`,
        bottom: `window.scrollTo(0, document.body.scrollHeight)`,
      }
      await wc.executeJavaScript(scripts[direction] ?? `window.scrollBy(0, ${amount})`)
      return { text: `Scrolled ${direction}` }
    }

    case 'wait': {
      const ms = Math.min(Number(input.ms) || 1000, 3000)
      await new Promise(r => setTimeout(r, ms))
      return { text: `Waited ${ms}ms` }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export async function runAgent(
  task: string,
  wc: WebContents,
  navigateFn: (url: string) => void,
  apiKey: string | undefined,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  stopped = false
  const client = new Anthropic({ apiKey })
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: task },
  ]

  try {
    while (!stopped) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      })

      for (const block of response.content) {
        if (block.type === 'text' && block.text.trim()) {
          onEvent({ type: 'text', text: block.text.trim() })
        }
      }

      if (response.stop_reason !== 'tool_use') break

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use' || stopped) continue

        const inp = block.input as Record<string, unknown>
        onEvent({ type: 'toolCall', id: block.id, name: block.name, input: inp })

        try {
          const result = await execTool(block.name, inp, wc, navigateFn)
          onEvent({ type: 'toolResult', id: block.id, name: block.name, ok: true, ...result })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result.imageData
              ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: result.imageData } }]
              : (result.text ?? ''),
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          onEvent({ type: 'toolResult', id: block.id, name: block.name, ok: false, text: msg })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            is_error: true,
            content: msg,
          })
        }
      }

      if (stopped) break
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }

    onEvent({ type: 'done' })
  } catch (err) {
    onEvent({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
