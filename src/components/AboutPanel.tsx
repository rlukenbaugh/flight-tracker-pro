import { useEffect, useState } from 'react'
import type { DesktopAppInfo, DesktopBridge } from '../types'

const webFallback: DesktopAppInfo = {
  version: 'web-preview',
  platform: 'browser',
  desktop: false,
  packaged: false,
  updateStatus: 'unavailable',
  updateMessage: 'Update checks are only available in the packaged Windows app.',
}

function desktopBridge(): DesktopBridge | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.flightTrackerDesktop
}

export function AboutPanel() {
  const [appInfo, setAppInfo] = useState<DesktopAppInfo>(webFallback)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const bridge = desktopBridge()

    if (!bridge?.getAppInfo) {
      return
    }

    bridge
      .getAppInfo()
      .then((info) => {
        setAppInfo(info)
      })
      .catch(() => {
        setAppInfo(webFallback)
      })
  }, [])

  async function handleCheckForUpdates() {
    const bridge = desktopBridge()

    if (!bridge?.checkForUpdates) {
      setAppInfo(webFallback)
      return
    }

    setIsChecking(true)

    try {
      const nextInfo = await bridge.checkForUpdates()
      setAppInfo(nextInfo)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <section className="panel about-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">About</span>
          <h2>Desktop release health and update status</h2>
        </div>
        <span className="section-aside">v{appInfo.version}</span>
      </div>

      <div className="about-grid">
        <article className="about-stat">
          <span>Platform</span>
          <strong>{appInfo.platform}</strong>
        </article>
        <article className="about-stat">
          <span>Build</span>
          <strong>{appInfo.packaged ? 'Packaged desktop' : 'Browser or dev shell'}</strong>
        </article>
        <article className="about-stat">
          <span>Updater</span>
          <strong>{appInfo.updateStatus.replace('-', ' ')}</strong>
        </article>
      </div>

      <p className="about-copy">{appInfo.updateMessage}</p>

      <div className="about-actions">
        <button type="button" className="primary-button subtle" onClick={handleCheckForUpdates} disabled={isChecking}>
          {isChecking ? 'Checking for updates...' : 'Check for updates'}
        </button>
        <span className="plan-hint">
          {appInfo.desktop
            ? 'Published GitHub releases will be discovered automatically in packaged builds.'
            : 'Open the packaged Windows app to test updater behavior end to end.'}
        </span>
      </div>
    </section>
  )
}
