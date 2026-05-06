import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface Bookmark {
  id: string
  title: string
  url: string
  favicon?: string
  folderId?: string
  createdAt: number
}

export interface BookmarkFolder {
  id: string
  name: string
  parentId?: string
}

interface BookmarkStore { bookmarks: Bookmark[]; folders: BookmarkFolder[] }
let store: BookmarkStore = { bookmarks: [], folders: [] }
let filePath = ''

export function loadBookmarks() {
  filePath = join(app.getPath('userData'), 'atlas-bookmarks.json')
  try {
    if (existsSync(filePath)) store = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch { store = { bookmarks: [], folders: [] } }
}

function save() { try { writeFileSync(filePath, JSON.stringify(store), 'utf-8') } catch {} }

export function getBookmarks() { return store }
export function addBookmark(b: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
  const bk = { ...b, id: `bk_${Date.now()}`, createdAt: Date.now() }
  store.bookmarks.push(bk); save(); return bk
}
export function removeBookmark(id: string) {
  store.bookmarks = store.bookmarks.filter(b => b.id !== id); save()
}
export function isBookmarked(url: string) { return store.bookmarks.some(b => b.url === url) }
export function updateBookmark(id: string, updates: Partial<Bookmark>) {
  const idx = store.bookmarks.findIndex(b => b.id === id)
  if (idx >= 0) { store.bookmarks[idx] = { ...store.bookmarks[idx], ...updates }; save() }
}
export function addFolder(name: string, parentId?: string): BookmarkFolder {
  const f = { id: `folder_${Date.now()}`, name, parentId }
  store.folders.push(f); save(); return f
}
