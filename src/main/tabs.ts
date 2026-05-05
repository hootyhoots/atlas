import { WebContentsView, BrowserWindow } from 'electron'
import type { TabState } from '../shared/types'

export type { TabState }
export const CHROME_HEIGHT = 80

interface Tab {
  view: WebContentsView
  state: TabState
}

export class TabManager {
  private tabs = new Map<number, Tab>()
  private activeId: number | null = null
  private nextId = 1
  private win: BrowserWindow
  private rendererReady = false

  constructor(win: BrowserWindow) {
    this.win = win
  }

  setRendererReady() {
    this.rendererReady = true
    this.pushState()
  }

  create(url = 'https://www.google.com'): number {
    const id = this.nextId++
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      }
    })

    const state: TabState = {
      id,
      title: 'New Tab',
      url,
      favicon: '',
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
    }

    this.win.contentView.addChildView(view)
    this.tabs.set(id, { view, state })

    const wc = view.webContents

    wc.on('page-title-updated', (_, title) => {
      state.title = title
      this.pushState()
    })

    wc.on('page-favicon-updated', (_, favicons) => {
      state.favicon = favicons[0] ?? ''
      this.pushState()
    })

    wc.on('did-navigate', (_, navUrl) => {
      state.url = navUrl
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    wc.on('did-navigate-in-page', (_, navUrl) => {
      state.url = navUrl
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    wc.on('did-start-loading', () => {
      state.isLoading = true
      this.pushState()
    })

    wc.on('did-stop-loading', () => {
      state.isLoading = false
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    view.setVisible(false)
    wc.loadURL(url)
    this.switchTo(id)
    return id
  }

  close(id: number) {
    const tab = this.tabs.get(id)
    if (!tab) return

    this.win.contentView.removeChildView(tab.view)
    tab.view.webContents.close()
    this.tabs.delete(id)

    if (this.activeId === id) {
      const remaining = [...this.tabs.keys()]
      if (remaining.length > 0) {
        this.switchTo(remaining[remaining.length - 1])
      } else {
        this.activeId = null
        this.create()
      }
    }

    this.pushState()
  }

  switchTo(id: number) {
    this.activeId = id

    for (const [tabId, { view }] of this.tabs) {
      if (tabId === id) {
        view.setVisible(true)
        this.updateBounds(view)
      } else {
        view.setVisible(false)
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    }

    this.pushState()
  }

  navigate(url: string) {
    const tab = this.activeTab
    if (tab) tab.view.webContents.loadURL(url)
  }

  back() {
    const wc = this.activeTab?.view.webContents
    if (wc?.canGoBack()) wc.goBack()
  }

  forward() {
    const wc = this.activeTab?.view.webContents
    if (wc?.canGoForward()) wc.goForward()
  }

  reload() {
    this.activeTab?.view.webContents.reload()
  }

  updateActiveBounds() {
    const tab = this.activeTab
    if (tab) this.updateBounds(tab.view)
  }

  private get activeTab(): Tab | undefined {
    return this.activeId != null ? this.tabs.get(this.activeId) : undefined
  }

  private updateBounds(view: WebContentsView) {
    const { width, height } = this.win.getContentBounds()
    view.setBounds({
      x: 0,
      y: CHROME_HEIGHT,
      width,
      height: Math.max(0, height - CHROME_HEIGHT),
    })
  }

  private pushState() {
    if (!this.rendererReady) return
    const tabs = [...this.tabs.values()].map(t => t.state)
    this.win.webContents.send('tabs:state', tabs, this.activeId)
  }

  getInitialState() {
    return {
      tabs: [...this.tabs.values()].map(t => t.state),
      activeId: this.activeId,
    }
  }
}
