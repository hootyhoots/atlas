import React, { useState, useEffect, useRef } from 'react'

interface Props {
  result: { active: number; total: number } | null
  onClose: () => void
}

export default function FindBar({ result, onClose }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.trim()) {
      window.browser.find.search(query, true)
    } else {
      window.browser.find.stop()
    }
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (query.trim()) window.browser.find.search(query, !e.shiftKey)
    }
    if (e.key === 'Escape') onClose()
  }

  const noResults = !!query && result?.total === 0
  const countText = !query ? '' : result == null ? '' : result.total === 0 ? 'No results' : `${result.active} / ${result.total}`

  return (
    <div className="find-bar">
      <div className="find-bar__inner">
        <div className={`find-bar__input-wrap${noResults ? ' find-bar__input-wrap--no-results' : ''}`}>
          <input
            ref={inputRef}
            className="find-bar__input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find in page…"
            spellCheck={false}
          />
          {countText && <span className="find-bar__count">{countText}</span>}
        </div>
        <div className="find-bar__actions">
          <button
            className="find-bar__btn"
            onClick={() => window.browser.find.search(query, false)}
            disabled={!query}
            title="Previous (Shift+Enter)"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8l4-4 4 4"/>
            </svg>
          </button>
          <button
            className="find-bar__btn"
            onClick={() => window.browser.find.search(query, true)}
            disabled={!query}
            title="Next (Enter)"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l4 4 4-4"/>
            </svg>
          </button>
          <div className="find-bar__sep" />
          <button className="find-bar__btn" onClick={onClose} title="Close (Esc)">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 1l10 10M11 1 1 11"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
