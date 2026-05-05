import React, { useState, useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  onClose: () => void
}

type View = 'chat' | 'settings'

export default function Sidebar({ onClose }: Props) {
  const [view, setView] = useState<View>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [hasEnvKey, setHasEnvKey] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const offChunk = window.browser.ai.onChunk((text) => {
      setStreamingText(prev => prev + text)
    })
    const offDone = window.browser.ai.onDone(() => {
      setStreamingText(prev => {
        if (prev) setMessages(msgs => [...msgs, { role: 'assistant', content: prev }])
        return ''
      })
      setIsStreaming(false)
    })
    const offError = window.browser.ai.onError((msg) => {
      setMessages(msgs => [...msgs, { role: 'assistant', content: `⚠ ${msg}` }])
      setStreamingText('')
      setIsStreaming(false)
    })
    return () => { offChunk(); offDone(); offError() }
  }, [])

  useEffect(() => {
    window.browser.settings.get().then(s => {
      setApiKey(s.apiKey ?? '')
      setSavedKey(s.apiKey ?? '')
      setHasEnvKey(s.hasEnvKey)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  function sendMessage(text: string, includePageContent = false) {
    if (isStreaming || !text.trim()) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setIsStreaming(true)
    window.browser.ai.chat(next, includePageContent)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input.trim())
    }
  }

  async function handleSaveKey() {
    await window.browser.settings.save({ apiKey })
    setSavedKey(apiKey)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  async function handleClearKey() {
    await window.browser.settings.save({ apiKey: '' })
    setApiKey('')
    setSavedKey('')
  }

  const keyStatus = hasEnvKey ? 'env' : savedKey ? 'saved' : 'none'
  const canSave = !!apiKey.trim() && apiKey !== savedKey

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">✦</span>
          <span className="sidebar-title">Atlas AI</span>
        </div>
        <div className="sidebar-header-btns">
          <button
            className={`sidebar-icon-btn${view === 'settings' ? ' sidebar-icon-btn--active' : ''}`}
            onClick={() => setView(v => v === 'settings' ? 'chat' : 'settings')}
            title="Settings"
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319Zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319Z"/>
            </svg>
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close sidebar"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
              <path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {view === 'settings' ? (
        <div className="settings-panel">
          <div className="settings-section">
            <div className="settings-label">Anthropic API Key</div>
            <div className={`key-status-badge key-status-badge--${keyStatus}`}>
              <span className="key-status-dot" />
              {keyStatus === 'env' && 'Set via environment variable'}
              {keyStatus === 'saved' && 'Custom key active'}
              {keyStatus === 'none' && 'Not configured'}
            </div>
            {keyStatus === 'env' && (
              <p className="settings-hint">ANTHROPIC_API_KEY is in your environment. You can override it with a saved key below.</p>
            )}
            <div className="key-input-row">
              <input
                className="settings-input"
                type={keyVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                spellCheck={false}
                autoComplete="off"
              />
              <button
                className="key-vis-btn"
                onClick={() => setKeyVisible(v => !v)}
                title={keyVisible ? 'Hide key' : 'Show key'}
              >
                {keyVisible
                  ? <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.135 13.135 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>
                }
              </button>
            </div>
            <div className="settings-row-actions">
              <button
                className="settings-btn settings-btn--primary"
                onClick={handleSaveKey}
                disabled={!canSave}
              >
                {saveStatus === 'saved' ? '✓ Saved' : 'Save Key'}
              </button>
              {savedKey && (
                <button className="settings-btn settings-btn--ghost" onClick={handleClearKey}>
                  Clear saved key
                </button>
              )}
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <div className="settings-label">About Atlas AI</div>
            <p className="settings-hint">
              Powered by Claude (claude-sonnet-4-6). Conversations are session-only and not stored between browser restarts.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="quick-actions">
            <button className="chip" onClick={() => sendMessage('Summarize this page for me.', true)} disabled={isStreaming}>
              <svg className="chip-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5.5 1.5v2a1 1 0 0 0 1 1h2zM5 12a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2zm0-2a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2zm0-2a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2z"/></svg>
              Summarize
            </button>
            <button className="chip" onClick={() => sendMessage('What are the key points on this page?', true)} disabled={isStreaming}>
              <svg className="chip-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/></svg>
              Key points
            </button>
            <button className="chip" onClick={() => sendMessage('What is the main topic or purpose of this page?', true)} disabled={isStreaming}>
              <svg className="chip-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/></svg>
              Explain page
            </button>
          </div>

          <div className="sidebar-messages">
            {messages.length === 0 && !isStreaming && (
              <div className="empty-state">
                <div className="empty-icon">✦</div>
                <div className="empty-title">How can I help?</div>
                <div className="empty-body">Ask a question or use the chips above to analyze the current page.</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`message message--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="msg-avatar">✦</div>
                )}
                <div className="message-bubble">{msg.content}</div>
              </div>
            ))}

            {isStreaming && (
              <div className="message message--assistant">
                <div className="msg-avatar">✦</div>
                <div className="message-bubble">
                  {streamingText || (
                    <span className="thinking-dots">
                      <span /><span /><span />
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="sidebar-input-area">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                className="sidebar-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Atlas AI…"
                rows={1}
                disabled={isStreaming}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage(input.trim())}
                disabled={isStreaming || !input.trim()}
                aria-label="Send message"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"/>
                </svg>
              </button>
            </div>
            <div className="input-hint">Enter to send · Shift+Enter for new line</div>
          </div>
        </>
      )}
    </div>
  )
}
