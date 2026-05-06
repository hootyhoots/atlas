import React, { useState, useEffect } from 'react'

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.browser.winControls.isMaximized().then(setMaximized)
    return window.browser.winControls.onMaximizedChange(setMaximized)
  }, [])

  return (
    <div className="win-controls">
      <button
        className="win-ctrl win-ctrl--min"
        onClick={() => window.browser.winControls.minimize()}
        title="Minimize"
        aria-label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        className="win-ctrl win-ctrl--max"
        onClick={() => window.browser.winControls.maximize()}
        title={maximized ? 'Restore' : 'Maximize'}
        aria-label={maximized ? 'Restore' : 'Maximize'}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="0" width="8" height="8" />
            <path d="M0 2v8h8" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0" y="0" width="10" height="10" />
          </svg>
        )}
      </button>
      <button
        className="win-ctrl win-ctrl--close"
        onClick={() => window.browser.winControls.close()}
        title="Close"
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M1 1l8 8M9 1 1 9" />
        </svg>
      </button>
    </div>
  )
}
