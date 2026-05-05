import React, { useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import AddressBar from './components/AddressBar'
import Sidebar from './components/Sidebar'
import type { TabState } from './types'

const SIDEBAR_WIDTH = 340

export default function App() {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  const active = tabs.find(t => t.id === activeId)

  return (
    <div className="app">
      <div className="chrome">
        <TabBar
          tabs={tabs}
          activeId={activeId}
          onSwitch={id => window.browser.tabs.switch(id)}
          onClose={id => window.browser.tabs.close(id)}
          onNew={() => window.browser.tabs.create()}
        />
        <AddressBar
          url={active?.url ?? ''}
          isLoading={active?.isLoading ?? false}
          canGoBack={active?.canGoBack ?? false}
          canGoForward={active?.canGoForward ?? false}
          onNavigate={url => window.browser.tabs.navigate(url)}
          onBack={() => window.browser.tabs.back()}
          onForward={() => window.browser.tabs.forward()}
          onReload={() => window.browser.tabs.reload()}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
      </div>
      <div className="content-area">
        <div className="web-spacer" />
        {sidebarOpen && (
          <Sidebar onClose={() => setSidebarOpen(false)} />
        )}
      </div>
    </div>
  )
}
