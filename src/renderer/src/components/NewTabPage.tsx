import React, { useState, useEffect } from 'react'
import type { Bookmark } from '../types'

interface Props {
  onNavigate: (url: string) => void
  onFocusAddressBar: () => void
}

export default function NewTabPage({ onNavigate, onFocusAddressBar }: Props) {
  const [time, setTime] = useState(new Date())
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    window.browser.bookmarks.get().then(data => setBookmarks(data.bookmarks.slice(0, 8)))
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const greeting = time.getHours() < 12 ? 'Good morning' : time.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="new-tab-page">
      <div className="new-tab-content">
        <div className="new-tab-clock">{hours}:{minutes}</div>
        <div className="new-tab-greeting">{greeting}</div>
        <button className="new-tab-search-btn" onClick={onFocusAddressBar}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.5 }}>
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
          </svg>
          <span>Search or enter address</span>
        </button>
        {bookmarks.length > 0 && (
          <div className="new-tab-bookmarks">
            <div className="new-tab-bookmarks-label">Bookmarks</div>
            <div className="new-tab-bookmarks-grid">
              {bookmarks.map(bk => (
                <button key={bk.id} className="new-tab-bookmark" onClick={() => onNavigate(bk.url)} title={bk.url}>
                  {bk.favicon ? (
                    <img src={bk.favicon} alt="" className="new-tab-bookmark__icon" />
                  ) : (
                    <div className="new-tab-bookmark__icon new-tab-bookmark__icon--placeholder">
                      {bk.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="new-tab-bookmark__title">{bk.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
