import React from 'react'
import type { TabState } from '../types'

interface Props {
  tabs: TabState[]
  activeId: number | null
  onSwitch: (id: number) => void
  onClose: (id: number) => void
  onNew: () => void
}

export default function TabBar({ tabs, activeId, onSwitch, onClose, onNew }: Props) {
  return (
    <div className="tab-bar">
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${tab.id === activeId ? 'tab--active' : ''}`}
            onClick={() => onSwitch(tab.id)}
          >
            {tab.favicon ? (
              <img className="tab__favicon" src={tab.favicon} alt="" />
            ) : (
              <span className="tab__favicon-placeholder" />
            )}
            <span className="tab__title">{tab.title || 'New Tab'}</span>
            {tab.isLoading && <span className="tab__spinner" />}
            <button
              className="tab__close"
              onClick={e => {
                e.stopPropagation()
                onClose(tab.id)
              }}
              aria-label="Close tab"
            >
              ×
            </button>
          </button>
        ))}
      </div>
      <button className="new-tab-btn" onClick={onNew} aria-label="New tab">
        +
      </button>
    </div>
  )
}
