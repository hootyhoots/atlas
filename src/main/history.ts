import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface HistoryEntry {
  url: string
  title: string
  favicon?: string
  visitedAt: number
}

const MAX = 5000
let entries: HistoryEntry[] = []
let filePath = ''

export function loadHistory() {
  filePath = join(app.getPath('userData'), 'atlas-history.json')
  try {
    if (existsSync(filePath)) entries = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch { entries = [] }
}

function save() { try { writeFileSync(filePath, JSON.stringify(entries.slice(-MAX)), 'utf-8') } catch {} }

export function addHistoryEntry(url: string, title: string, favicon?: string) {
  if (!url.startsWith('http')) return
  entries.push({ url, title, favicon, visitedAt: Date.now() })
  if (entries.length > MAX) entries = entries.slice(-MAX)
  save()
}

export function getHistory() { return [...entries].reverse().slice(0, 200) }
export function deleteHistoryEntry(visitedAt: number) {
  entries = entries.filter(e => e.visitedAt !== visitedAt); save()
}
export function clearHistory() { entries = []; save() }
export function searchHistory(q: string) {
  const lower = q.toLowerCase()
  return entries.filter(e => e.title.toLowerCase().includes(lower) || e.url.toLowerCase().includes(lower)).reverse().slice(0, 100)
}
