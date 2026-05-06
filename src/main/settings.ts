import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

interface Settings {
  apiKey?: string
  adBlockEnabled?: boolean
}

const settingsPath = join(app.getPath('userData'), 'atlas-settings.json')
let cache: Settings = {}

export function loadSettings(): void {
  try {
    if (existsSync(settingsPath)) {
      cache = JSON.parse(readFileSync(settingsPath, 'utf8'))
    }
  } catch {}
}

export function getSettings(): Settings {
  return cache
}

export function saveSettings(updates: Partial<Settings>): Settings {
  cache = { ...cache, ...updates }
  try {
    writeFileSync(settingsPath, JSON.stringify(cache, null, 2), 'utf8')
  } catch {}
  return cache
}
