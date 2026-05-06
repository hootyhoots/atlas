import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

export interface AddressBarHandle {
  focus: () => void
  exitEditing: () => void
}

interface Props {
  url: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onQueryChange: (text: string, isEditing: boolean) => void
  aiVisible: boolean
  onToggleAiVisible: () => void
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname + (u.pathname !== '/' ? u.pathname : '')
  } catch {
    return url
  }
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3 5 8l5 5"/>
    </svg>
  )
}

function ForwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5"/>
    </svg>
  )
}

function ReloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
      <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 1l10 10M11 1 1 11"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="10" height="11" viewBox="0 0 12 14" fill="currentColor" style={{ color: '#34c759', flexShrink: 0 }}>
      <path d="M6 0a4 4 0 0 0-4 4v1H1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1V4a4 4 0 0 0-4-4m2 5V4a2 2 0 1 0-4 0v1z"/>
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#8e8e93', flexShrink: 0 }}>
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
    </svg>
  )
}

function EyeOpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/>
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
      <path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/>
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/>
    </svg>
  )
}

const AddressBar = forwardRef<AddressBarHandle, Props>(function AddressBar(
  { url, isLoading, canGoBack, canGoForward, onNavigate, onBack, onForward, onReload,
    sidebarOpen, onToggleSidebar, onQueryChange, aiVisible, onToggleAiVisible },
  ref
) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const secure = url.startsWith('https://')

  useImperativeHandle(ref, () => ({
    focus() {
      setValue(url)
      setEditing(true)
      setTimeout(() => inputRef.current?.select(), 0)
    },
    exitEditing() {
      setEditing(false)
      setValue(url)
      inputRef.current?.blur()
    },
  }))

  const displayed = editing ? value : displayUrl(url)

  function startEdit() {
    setValue(url)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit(nav = true) {
    setEditing(false)
    onQueryChange('', false)
    if (nav && value.trim()) onNavigate(value.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') commit(false)
    // ArrowUp/Down are handled by App.tsx via document keydown
  }

  useEffect(() => {
    if (!editing) setValue(url)
  }, [url, editing])

  useEffect(() => {
    onQueryChange(editing ? value : '', editing)
  }, [value, editing])

  return (
    <div className="toolbar">
      {isLoading && <div className="loading-bar"><div className="loading-bar__fill" /></div>}

      <div className="nav-buttons">
        <button className="nav-btn" onClick={onBack} disabled={!canGoBack} aria-label="Back">
          <BackIcon />
        </button>
        <button className="nav-btn" onClick={onForward} disabled={!canGoForward} aria-label="Forward">
          <ForwardIcon />
        </button>
        <button className="nav-btn" onClick={onReload} aria-label={isLoading ? 'Stop' : 'Reload'}>
          {isLoading ? <StopIcon /> : <ReloadIcon />}
        </button>
      </div>

      <div className={`address-bar${editing ? ' address-bar--editing' : ''}`} onClick={startEdit}>
        <span className="address-bar__icon">
          {url && (secure ? <LockIcon /> : <GlobeIcon />)}
        </span>
        <input
          ref={inputRef}
          className="address-input"
          value={displayed}
          readOnly={!editing}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(false)}
          spellCheck={false}
        />
      </div>

      <button
        className={`nav-btn ai-visible-btn${aiVisible ? ' ai-visible-btn--on' : ' ai-visible-btn--off'}`}
        onClick={onToggleAiVisible}
        aria-label={aiVisible ? 'AI can see this page' : 'AI cannot see this page'}
        title={aiVisible ? 'AI page visibility: on' : 'AI page visibility: off'}
      >
        {aiVisible ? <EyeOpenIcon /> : <EyeOffIcon />}
      </button>

      <button
        className={`nav-btn ai-toggle-btn${sidebarOpen ? ' ai-toggle-btn--active' : ''}`}
        onClick={onToggleSidebar}
        aria-label="Toggle AI sidebar"
        title="Atlas AI"
      >
        <SparkleIcon />
      </button>
    </div>
  )
})

export default AddressBar
