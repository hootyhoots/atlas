import React, { useState, useEffect, useRef } from 'react'
import type { AgentEvent } from '../types'

type TimelineItem =
  | { kind: 'text'; text: string }
  | { kind: 'toolCall'; id: string; name: string; input: Record<string, unknown>; status: 'pending' | 'ok' | 'error'; resultText?: string; imageData?: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

const TOOL_LABELS: Record<string, string> = {
  screenshot: 'Screenshot',
  get_page_info: 'Page info',
  click: 'Click',
  type: 'Type',
  navigate: 'Navigate',
  scroll: 'Scroll',
  wait: 'Wait',
}

function toolSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'click': return input.selector ? `${input.selector}` : `"${input.text}"`
    case 'type': return `"${String(input.text).slice(0, 40)}${String(input.text).length > 40 ? '…' : ''}"`
    case 'navigate': return String(input.url)
    case 'scroll': return `${input.direction}${input.amount ? ` ${input.amount}px` : ''}`
    case 'wait': return `${input.ms ?? 1000}ms`
    default: return ''
  }
}

export default function AgentView() {
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(false)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [expandedImg, setExpandedImg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const off = window.browser.agent.onEvent((evt: AgentEvent) => {
      setTimeline(prev => {
        if (evt.type === 'text') {
          return [...prev, { kind: 'text', text: evt.text }]
        }
        if (evt.type === 'toolCall') {
          return [...prev, { kind: 'toolCall', id: evt.id, name: evt.name, input: evt.input, status: 'pending' }]
        }
        if (evt.type === 'toolResult') {
          return prev.map(item => {
            if (item.kind === 'toolCall' && item.id === evt.id) {
              return { ...item, status: evt.ok ? 'ok' : 'error', resultText: evt.text, imageData: evt.imageData }
            }
            return item
          })
        }
        if (evt.type === 'done') {
          setRunning(false)
          return [...prev, { kind: 'done' }]
        }
        if (evt.type === 'error') {
          setRunning(false)
          return [...prev, { kind: 'error', message: evt.message }]
        }
        return prev
      })
    })
    return off
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [timeline])

  function handleRun() {
    const t = task.trim()
    if (!t || running) return
    setTimeline([])
    setRunning(true)
    window.browser.agent.run(t)
  }

  function handleStop() {
    window.browser.agent.stop()
    setRunning(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRun()
    }
  }

  return (
    <div className="agent-view">
      {expandedImg && (
        <div className="agent-img-overlay" onClick={() => setExpandedImg(null)}>
          <img src={`data:image/png;base64,${expandedImg}`} alt="Screenshot" />
        </div>
      )}

      {timeline.length === 0 && !running ? (
        <div className="agent-empty">
          <div className="agent-empty-icon">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.183-.134"/>
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"/>
            </svg>
          </div>
          <div className="agent-empty-title">Browser Control</div>
          <div className="agent-empty-body">Describe what you want done and the AI agent will control the browser to complete the task.</div>
        </div>
      ) : (
        <div className="agent-timeline">
          {timeline.map((item, i) => {
            if (item.kind === 'text') {
              return (
                <div key={i} className="agent-text">
                  <div className="msg-avatar">✦</div>
                  <div className="agent-text-content">{item.text}</div>
                </div>
              )
            }
            if (item.kind === 'toolCall') {
              const label = TOOL_LABELS[item.name] ?? item.name
              const summary = toolSummary(item.name, item.input)
              return (
                <div key={i} className={`agent-tool agent-tool--${item.status}`}>
                  <div className="agent-tool-header">
                    <span className="agent-tool-status">
                      {item.status === 'pending' && <span className="agent-spinner" />}
                      {item.status === 'ok' && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      )}
                      {item.status === 'error' && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M1 1l10 10M11 1 1 11"/>
                        </svg>
                      )}
                    </span>
                    <span className="agent-tool-name">{label}</span>
                    {summary && <span className="agent-tool-summary">{summary}</span>}
                  </div>
                  {item.imageData && (
                    <button className="agent-screenshot-btn" onClick={() => setExpandedImg(item.imageData!)}>
                      <img
                        className="agent-screenshot-thumb"
                        src={`data:image/png;base64,${item.imageData}`}
                        alt="Screenshot"
                      />
                    </button>
                  )}
                  {item.resultText && item.name !== 'screenshot' && (
                    <div className="agent-tool-result">{item.resultText}</div>
                  )}
                </div>
              )
            }
            if (item.kind === 'done') {
              return (
                <div key={i} className="agent-done">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                  Task complete
                </div>
              )
            }
            if (item.kind === 'error') {
              return (
                <div key={i} className="agent-error">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 1l10 10M11 1 1 11"/>
                  </svg>
                  {item.message}
                </div>
              )
            }
            return null
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="agent-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="sidebar-input"
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What should the agent do?"
            rows={1}
            disabled={running}
          />
          {running ? (
            <button className="send-btn send-btn--stop" onClick={handleStop} aria-label="Stop agent">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect width="10" height="10" rx="2"/>
              </svg>
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={handleRun}
              disabled={!task.trim()}
              aria-label="Run agent"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"/>
              </svg>
            </button>
          )}
        </div>
        <div className="input-hint">Enter to run · Shift+Enter for new line</div>
      </div>
    </div>
  )
}
