import React, { useState, useEffect } from 'react'
import type { Extension } from '../types'

export default function ExtensionsView() {
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.browser.extensions.list().then(setExtensions)
  }, [])

  async function handleInstall() {
    setInstalling(true)
    setError(null)
    try {
      const ext = await window.browser.extensions.install()
      if (ext) {
        setExtensions(prev => [...prev.filter(e => e.id !== ext.id), ext])
      } else {
        setError('No valid extension found in the selected folder. Make sure it contains a manifest.json.')
      }
    } catch {
      setError('Failed to install extension.')
    } finally {
      setInstalling(false)
    }
  }

  async function handleRemove(id: string) {
    await window.browser.extensions.remove(id)
    setExtensions(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="extensions-view">
      <div className="extensions-toolbar">
        <span className="extensions-toolbar__title">Installed Extensions</span>
        <button
          className="extensions-install-btn"
          onClick={handleInstall}
          disabled={installing}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M6 1v10M1 6h10" />
          </svg>
          {installing ? 'Installing…' : 'Install'}
        </button>
      </div>

      {error && (
        <div className="extensions-error">{error}</div>
      )}

      {extensions.length === 0 ? (
        <div className="extensions-empty">
          <div className="extensions-empty__icon">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" opacity="0.25">
              <path d="M3.5 3.5A.5.5 0 0 1 4 3h4a.5.5 0 0 1 0 1H7.5v1H14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6.5V4H4a.5.5 0 0 1-.5-.5M2 6v8h12V6z"/>
            </svg>
          </div>
          <div className="extensions-empty__title">No extensions installed</div>
          <div className="extensions-empty__body">Click Install to add an unpacked Chrome extension folder.</div>
        </div>
      ) : (
        <div className="extensions-list">
          {extensions.map(ext => (
            <div key={ext.id} className="extension-item">
              <div className="extension-item__icon">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" opacity="0.4">
                  <path d="M3.5 3.5A.5.5 0 0 1 4 3h4a.5.5 0 0 1 0 1H7.5v1H14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6.5V4H4a.5.5 0 0 1-.5-.5"/>
                </svg>
              </div>
              <div className="extension-item__info">
                <div className="extension-item__name">{ext.name}</div>
                <div className="extension-item__meta">
                  <span className="extension-item__version">v{ext.version}</span>
                  {ext.description && (
                    <span className="extension-item__desc">{ext.description}</span>
                  )}
                </div>
              </div>
              <button
                className="extension-item__remove"
                onClick={() => handleRemove(ext.id)}
                title="Remove extension"
                aria-label={`Remove ${ext.name}`}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1 1 11" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="extensions-footer">
        <p>Supports unpacked Manifest V2 &amp; V3 extensions. Load from a local folder containing <code>manifest.json</code>.</p>
      </div>
    </div>
  )
}
