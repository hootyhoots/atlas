import React, { useState, useEffect } from 'react'
import type { Download } from '../types'

export default function DownloadsBar() {
  const [downloads, setDownloads] = useState<Map<string, Download>>(new Map())

  useEffect(() => {
    const offStart = window.browser.downloads.onStart(dl => {
      setDownloads(prev => new Map(prev).set(dl.id, dl))
    })
    const offProgress = window.browser.downloads.onProgress(info => {
      setDownloads(prev => {
        const next = new Map(prev)
        const existing = next.get(info.id)
        if (existing) {
          next.set(info.id, { ...existing, state: info.state, receivedBytes: info.receivedBytes, totalBytes: info.totalBytes })
        }
        return next
      })
    })
    const offDone = window.browser.downloads.onDone(info => {
      setDownloads(prev => {
        const next = new Map(prev)
        const existing = next.get(info.id)
        if (existing) {
          next.set(info.id, { ...existing, state: info.state, savePath: info.savePath })
        }
        return next
      })
    })
    return () => { offStart(); offProgress(); offDone() }
  }, [])

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const list = [...downloads.values()].reverse()

  return (
    <div className="downloads-bar">
      <div className="downloads-bar__header">
        <span className="downloads-bar__title">Downloads</span>
      </div>
      <div className="downloads-bar__list">
        {list.length === 0 ? (
          <div className="downloads-bar__empty">No downloads</div>
        ) : (
          list.map(dl => {
            const pct = dl.totalBytes > 0 ? Math.round((dl.receivedBytes / dl.totalBytes) * 100) : 0
            const isDone = dl.state === 'completed'
            const isFailed = dl.state === 'cancelled' || dl.state === 'interrupted'
            return (
              <div key={dl.id} className="downloads-bar__item">
                <div className="downloads-bar__item-info">
                  <span className="downloads-bar__filename" title={dl.filename}>{dl.filename}</span>
                  <span className="downloads-bar__size">
                    {isDone
                      ? formatBytes(dl.totalBytes || dl.receivedBytes)
                      : isFailed
                      ? 'Failed'
                      : `${formatBytes(dl.receivedBytes)} / ${formatBytes(dl.totalBytes)}`
                    }
                  </span>
                </div>
                {!isDone && !isFailed && (
                  <div className="downloads-bar__progress">
                    <div className="downloads-bar__progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {isDone && (
                  <div className="downloads-bar__actions">
                    <button
                      className="downloads-bar__btn"
                      onClick={() => window.browser.downloads.open(dl.savePath)}
                    >Open</button>
                    <button
                      className="downloads-bar__btn"
                      onClick={() => window.browser.downloads.showInFolder(dl.savePath)}
                    >Show</button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
