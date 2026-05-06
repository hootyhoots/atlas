import React from 'react'
import type { TabState } from '../types'

interface Props {
  tabs: TabState[]
  activeId: number | null
  onSwitch: (id: number) => void
  onClose: (id: number) => void
  onNew: () => void
}

function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.4 }}>
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
    </svg>
  )
}

export default function TabBar({ tabs, activeId, onSwitch, onClose, onNew }: Props) {
  return (
    <div className="tab-bar">
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab${tab.id === activeId ? ' tab--active' : ''}`}
            onClick={() => onSwitch(tab.id)}
            title={tab.title || 'New Tab'}
          >
            <span className="tab__icon">
              {tab.isLoading ? (
                <span className="tab__spinner" />
              ) : tab.favicon ? (
                <img className="tab__favicon" src={tab.favicon} alt="" />
              ) : (
                <GlobeIcon />
              )}
            </span>
            <span className="tab__title">{tab.title || 'New Tab'}</span>
            <button
              className="tab__close"
              onClick={e => { e.stopPropagation(); onClose(tab.id) }}
              aria-label="Close tab"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M1 1l8 8M9 1 1 9"/>
              </svg>
            </button>
          </button>
        ))}
      </div>
      <button className="new-tab-btn" onClick={onNew} aria-label="New tab" title="New tab">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M6 1v10M1 6h10"/>
        </svg>
      </button>
    </div>
  )
}
