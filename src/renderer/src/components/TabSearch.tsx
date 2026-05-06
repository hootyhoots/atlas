import React, { useState, useEffect, useRef } from 'react'
import type { TabState } from '../types'

interface Props {
  tabs: TabState[]
  onSwitch: (id: number) => void
  onClose: () => void
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.4, flexShrink: 0 }}>
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
    </svg>
  )
}

export default function TabSearch({ tabs, onSwitch, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? tabs.filter(t => {
        const q = query.toLowerCase()
        const title = (t.customTitle ?? t.title ?? '').toLowerCase()
        const url = (t.url ?? '').toLowerCase()
        return title.includes(q) || url.includes(q)
      })
    : tabs

  // Reset highlighted index when filter changes
  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const tab = filtered[activeIdx]
        if (tab) {
          onSwitch(tab.id)
          onClose()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtered, activeIdx, onSwitch, onClose])

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.querySelector<HTMLElement>('.tab-search-item--active')
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div className="tab-search-overlay">
      <div className="tab-search-header">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
        </svg>
        <input
          ref={inputRef}
          className="tab-search-input"
          placeholder="Search tabs..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <span className="tab-search-count">{filtered.length} tab{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="tab-search-list" ref={listRef}>
        {filtered.map((tab, i) => {
          const title = tab.customTitle ?? tab.title ?? 'New Tab'
          return (
            <button
              key={tab.id}
              className={`tab-search-item${i === activeIdx ? ' tab-search-item--active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={e => {
                e.preventDefault()
                onSwitch(tab.id)
                onClose()
              }}
            >
              <span className="tab-search-item__icon">
                {tab.favicon ? (
                  <img src={tab.favicon} alt="" width="14" height="14" style={{ borderRadius: 2 }} />
                ) : (
                  <GlobeIcon />
                )}
              </span>
              <span className="tab-search-item__text">
                <span className="tab-search-item__title">{title}</span>
                <span className="tab-search-item__url">{tab.url}</span>
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="tab-search-empty">No tabs match your search</div>
        )}
      </div>
    </div>
  )
}
