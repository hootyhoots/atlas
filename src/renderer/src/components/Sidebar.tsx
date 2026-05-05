import React, { useState, useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  onClose: () => void
}

export default function Sidebar({ onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const offChunk = window.browser.ai.onChunk((text) => {
      setStreamingText(prev => prev + text)
    })
    const offDone = window.browser.ai.onDone(() => {
      setStreamingText(prev => {
        if (prev) {
          setMessages(msgs => [...msgs, { role: 'assistant', content: prev }])
        }
        return ''
      })
      setIsStreaming(false)
    })
    const offError = window.browser.ai.onError((msg) => {
      setMessages(msgs => [...msgs, { role: 'assistant', content: `Error: ${msg}` }])
      setStreamingText('')
      setIsStreaming(false)
    })
    return () => { offChunk(); offDone(); offError() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  function sendMessage(text: string, includePageContent = false) {
    if (isStreaming) return
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
      const trimmed = input.trim()
      if (trimmed) sendMessage(trimmed)
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Atlas AI</span>
        <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">✕</button>
      </div>

      <div className="sidebar-quick-actions">
        <button
          className="quick-action-btn"
          onClick={() => sendMessage('Summarize this page for me.', true)}
          disabled={isStreaming}
        >
          Summarize Page
        </button>
        <button
          className="quick-action-btn"
          onClick={() => sendMessage('What are the key points on this page?', true)}
          disabled={isStreaming}
        >
          Key Points
        </button>
      </div>

      <div className="sidebar-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message message--${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {streamingText && (
          <div className="message message--assistant">
            <div className="message-content">{streamingText}<span className="cursor">▋</span></div>
          </div>
        )}
        {isStreaming && !streamingText && (
          <div className="message message--assistant">
            <div className="message-content thinking">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sidebar-input-area">
        <textarea
          className="sidebar-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this page…"
          rows={3}
          disabled={isStreaming}
        />
        <button
          className="sidebar-send"
          onClick={() => { const t = input.trim(); if (t) sendMessage(t) }}
          disabled={isStreaming || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
