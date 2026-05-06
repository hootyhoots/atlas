import React, { useState, useEffect } from 'react'
import type { HistoryEntry } from '../types'

export default function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [query, setQuery] = useState('')

  async function load() {
    const data = await window.browser.history.get()
    setEntries(data)
  }

  useEffect(() => { load() }, [])

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) {
      load()
      return
    }
    const results = await window.browser.history.search(q.trim())
    setEntries(results)
  }

  async function handleDelete(visitedAt: number) {
    await window.browser.history.delete(visitedAt)
    load()
  }

  async function handleClear() {
    if (!confirm('Clear all browsing history?')) return
    await window.browser.history.clear()
    setEntries([])
  }

  function formatDate(ts: number) {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="history-view">
      <div className="history-search-row">
        <input
          className="history-search-input"
          placeholder="Search history..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
        <button className="history-clear-btn" onClick={handleClear} title="Clear history">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
          </svg>
        </button>
      </div>
      <div className="history-list">
        {entries.length === 0 ? (
          <div className="history-empty">No history yet</div>
        ) : (
          entries.map(entry => (
            <div key={entry.visitedAt} className="history-item">
              <button
                className="history-item__link"
                onClick={() => window.browser.tabs.navigate(entry.url)}
                title={entry.url}
              >
                {entry.favicon ? (
                  <img src={entry.favicon} alt="" className="history-item__favicon" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.4, flexShrink: 0 }}>
                    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
                  </svg>
                )}
                <span className="history-item__title">{entry.title || entry.url}</span>
                <span className="history-item__time">{formatDate(entry.visitedAt)}</span>
              </button>
              <button
                className="history-item__delete"
                onClick={() => handleDelete(entry.visitedAt)}
                title="Remove from history"
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M1 1l8 8M9 1 1 9"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
