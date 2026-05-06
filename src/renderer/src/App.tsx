import React, { useEffect, useRef, useState, useCallback } from 'react'
import TabBar from './components/TabBar'
import AddressBar, { type AddressBarHandle } from './components/AddressBar'
import Sidebar from './components/Sidebar'
import FindBar from './components/FindBar'
import TabSearch from './components/TabSearch'
import type { TabState } from './types'

const SIDEBAR_WIDTH = 360
const FIND_BAR_HEIGHT = 46
const SUGGESTION_ITEM_HEIGHT = 40
const TAB_SEARCH_HEIGHT = 320

export default function App() {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [findOpen, setFindOpen] = useState(false)
  const [findResult, setFindResult] = useState<{ active: number; total: number } | null>(null)
  const [tabSearchOpen, setTabSearchOpen] = useState(false)
  const addressBarRef = useRef<AddressBarHandle>(null)

  // Keep browser and find state in refs to avoid stale closures
  const navigateRef = useRef((url: string) => window.browser.tabs.navigate(url))
  const suggestionsRef = useRef(suggestions)
  const highlightedRef = useRef(highlightedIdx)
  suggestionsRef.current = suggestions
  highlightedRef.current = highlightedIdx

  useEffect(() => {
    window.browser.ready().then(({ tabs, activeId }) => {
      setTabs(tabs)
      setActiveId(activeId)
    })
    return window.browser.tabs.onStateChange((tabs, activeId) => {
      setTabs(tabs)
      setActiveId(activeId)
    })
  }, [])

  useEffect(() => {
    window.browser.sidebar.setWidth(sidebarOpen ? SIDEBAR_WIDTH : 0)
  }, [sidebarOpen])

  // Focus address bar when main sends the signal (Cmd+L)
  useEffect(() => {
    return window.browser.onFocusAddressBar(() => addressBarRef.current?.focus())
  }, [])

  // Find bar toggle from menu (Cmd+F)
  useEffect(() => {
    return window.browser.onFindToggle(() => setFindOpen(f => !f))
  }, [])

  // Find results from webContents
  useEffect(() => {
    return window.browser.find.onResult(r => setFindResult(r))
  }, [])

  // Tab search toggle from menu (Cmd+Shift+A)
  useEffect(() => {
    return window.browser.tabs.onSearchToggle(() => setTabSearchOpen(t => !t))
  }, [])

  // extraTop: space between chrome and webContentsView for panels
  const extraTop = findOpen
    ? FIND_BAR_HEIGHT
    : tabSearchOpen
    ? TAB_SEARCH_HEIGHT
    : suggestions.length > 0
    ? suggestions.length * SUGGESTION_ITEM_HEIGHT
    : 0

  useEffect(() => {
    window.browser.view.setExtraTop(extraTop)
  }, [extraTop])

  // Keyboard handling for suggestions list (arrow keys + enter)
  useEffect(() => {
    if (!suggestions.length) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIdx(i => Math.min(i + 1, suggestionsRef.current.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIdx(i => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && highlightedRef.current >= 0) {
        const s = suggestionsRef.current[highlightedRef.current]
        navigateRef.current(s)
        setSuggestions([])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [suggestions.length])

  const queryChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stableQueryChange = useCallback((text: string, isEditing: boolean) => {
    if (queryChangeTimerRef.current) clearTimeout(queryChangeTimerRef.current)
    if (!isEditing || text.trim().length < 2) {
      setSuggestions([])
      setHighlightedIdx(-1)
      return
    }
    queryChangeTimerRef.current = setTimeout(async () => {
      const results = await window.browser.suggest.query(text.trim())
      setSuggestions(results)
      setHighlightedIdx(-1)
    }, 180)
  }, [])

  function closeFindBar() {
    setFindOpen(false)
    setFindResult(null)
    window.browser.find.stop()
  }

  const active = tabs.find(t => t.id === activeId)

  function handleToggleAiVisible() {
    if (activeId == null) return
    const current = active?.aiVisible ?? true
    window.browser.tabs.setAiVisible(activeId, !current)
  }

  function handleRename(id: number, title: string) {
    window.browser.tabs.rename(id, title)
  }

  return (
    <div className="app">
      <div className="chrome">
        <TabBar
          tabs={tabs}
          activeId={activeId}
          onSwitch={id => window.browser.tabs.switch(id)}
          onClose={id => window.browser.tabs.close(id)}
          onNew={() => window.browser.tabs.create()}
          onRename={handleRename}
        />
        <AddressBar
          ref={addressBarRef}
          url={active?.url ?? ''}
          isLoading={active?.isLoading ?? false}
          canGoBack={active?.canGoBack ?? false}
          canGoForward={active?.canGoForward ?? false}
          onNavigate={url => { window.browser.tabs.navigate(url); setSuggestions([]) }}
          onBack={() => window.browser.tabs.back()}
          onForward={() => window.browser.tabs.forward()}
          onReload={() => window.browser.tabs.reload()}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onQueryChange={stableQueryChange}
          aiVisible={active?.aiVisible ?? true}
          onToggleAiVisible={handleToggleAiVisible}
        />
      </div>

      {/* Panels that sit between chrome and web content */}
      {suggestions.length > 0 && !findOpen && !tabSearchOpen && (
        <div className="suggestions-panel">
          {suggestions.map((s, i) => (
            <button
              key={s}
              className={`suggestion-item${i === highlightedIdx ? ' suggestion-item--highlighted' : ''}`}
              onMouseDown={e => {
                e.preventDefault() // prevent input blur before we handle the click
                window.browser.tabs.navigate(s)
                setSuggestions([])
                addressBarRef.current?.exitEditing()
              }}
            >
              <svg className="suggestion-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
              </svg>
              <span className="suggestion-text">{s}</span>
            </button>
          ))}
        </div>
      )}

      {findOpen && (
        <FindBar result={findResult} onClose={closeFindBar} />
      )}

      {tabSearchOpen && (
        <TabSearch
          tabs={tabs}
          onSwitch={id => { window.browser.tabs.switch(id); setTabSearchOpen(false) }}
          onClose={() => setTabSearchOpen(false)}
        />
      )}

      <div className="content-area">
        <div className="web-spacer" />
        {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      </div>
    </div>
  )
}
