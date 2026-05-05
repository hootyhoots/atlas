import React, { useState, useEffect, useRef } from 'react'

interface Props {
  url: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname + (u.pathname !== '/' ? u.pathname : '')
  } catch {
    return url
  }
}

export default function AddressBar({
  url,
  isLoading,
  canGoBack,
  canGoForward,
  onNavigate,
  onBack,
  onForward,
  onReload,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayed = editing ? value : displayUrl(url)

  function startEdit() {
    setValue(url)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    setEditing(false)
    if (value.trim()) onNavigate(value.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  useEffect(() => {
    if (!editing) setValue(url)
  }, [url, editing])

  return (
    <div className="toolbar">
      <div className="nav-buttons">
        <button
          className="nav-btn"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Back"
        >
          ‹
        </button>
        <button
          className="nav-btn"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Forward"
        >
          ›
        </button>
        <button
          className="nav-btn"
          onClick={onReload}
          aria-label={isLoading ? 'Stop' : 'Reload'}
        >
          {isLoading ? '✕' : '↻'}
        </button>
      </div>
      <div className="address-bar" onClick={startEdit}>
        <input
          ref={inputRef}
          className="address-input"
          value={displayed}
          readOnly={!editing}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          spellCheck={false}
        />
      </div>
    </div>
  )
}
