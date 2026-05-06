import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

interface Memory {
  url: string
  title: string
  snippet: string
  timestamp: number
}

const MAX = 100
let memories: Memory[] = []
let filePath = ''

export function loadMemories() {
  filePath = join(app.getPath('userData'), 'atlas-memories.json')
  try {
    if (existsSync(filePath)) memories = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch { memories = [] }
}

function save() {
  try { writeFileSync(filePath, JSON.stringify(memories), 'utf-8') } catch {}
}

export function addMemory(url: string, title: string, snippet: string) {
  if (!url.startsWith('http')) return
  const idx = memories.findIndex(m => m.url === url)
  const entry = { url, title, snippet: snippet.slice(0, 400), timestamp: Date.now() }
  if (idx >= 0) { memories[idx] = entry } else {
    memories.push(entry)
    if (memories.length > MAX) memories = memories.slice(-MAX)
  }
  save()
}

export function getMemories(): Memory[] {
  return [...memories].sort((a, b) => b.timestamp - a.timestamp)
}

export function clearMemories() { memories = []; save() }
