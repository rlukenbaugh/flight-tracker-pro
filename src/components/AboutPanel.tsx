import { useEffect, useState } from 'react'
import { desktopReleaseLinks } from '../data/appConfig'
import { apiBaseUrl, appEnvironmentLabel, buildApiUrl } from '../lib/runtimeConfig'
import type { DesktopAppInfo, DesktopBridge } from '../types'

const webFallback: DesktopAppInfo = {
  version: 'web-preview',
  platform: 'browser',
  desktop: false,
  packaged: false,
  environment: appEnvironmentLabel,
  releaseChannel: 'preview',
  updateStatus: 'unavailable',
  updateMessage: 'Update checks are only available in the packaged Windows app.',
}

function desktopBridge(): DesktopBridge | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.flightTrackerDesktop
}

type ApiHealthState = {
  status: 'checking' | 'reachable' | 'unreachable' | 'disabled'
  detail: string
  host: string
}

export function AboutPanel() {
  const [appInfo, setAppInfo] = useState<DesktopAppInfo>(webFallback)
  const [isChecking, setIsChecking] = useState(false)
  const [apiHealth, setApiHealth] = useState<ApiHealthState>(() =>
    apiBaseUrl
      ? {
          status: 'checking',
          detail: 'Checking hosted API reachability.',
          host: apiBaseUrl,
        }
      : {
          status: 'disabled',
          detail: 'No hosted API base URL is configured for this build.',
          host: 'Not configured',
        },
  )
  const releaseNotesUrl =
    appInfo.version === 'web-preview'
      ? desktopReleaseLinks.latestReleaseUrl
      : `${desktopReleaseLinks.repoUrl}/releases/tag/v${appInfo.version}`

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

    void checkApiHealth()
  }, [])

  async function checkApiHealth() {
    if (!apiBaseUrl) {
      setApiHealth({
        status: 'disabled',
        detail: 'No hosted API base URL is configured for this build.',
        host: 'Not configured',
      })
      return
    }

    setApiHealth({
      status: 'checking',
      detail: 'Checking hosted API reachability.',
      host: apiBaseUrl,
    })

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4_000)

    try {
      const response = await fetch(buildApiUrl('/api/health'), {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`)
      }

      const payload = (await response.json()) as {
        ok?: boolean
        environment?: string
        providers?: {
          flightOffers?: boolean
          supabase?: boolean
        }
      }

      setApiHealth({
        status: payload.ok ? 'reachable' : 'unreachable',
        detail: payload.ok
          ? `API reachable in ${payload.environment ?? 'unknown'} mode. Flight provider ${payload.providers?.flightOffers ? 'configured' : 'not configured'}, Supabase ${payload.providers?.supabase ? 'configured' : 'not configured'}.`
          : 'Health endpoint responded without an OK status.',
        host: apiBaseUrl,
      })
    } catch (error) {
      setApiHealth({
        status: 'unreachable',
        detail:
          error instanceof Error
            ? error.message
            : 'Unable to reach the configured API host.',
        host: apiBaseUrl,
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }

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
        <article className="about-stat">
          <span>API reachability</span>
          <strong>{apiHealth.status}</strong>
        </article>
        <article className="about-stat">
          <span>Channel</span>
          <strong>{appInfo.releaseChannel}</strong>
        </article>
        <article className="about-stat">
          <span>Environment</span>
          <strong>{appInfo.environment}</strong>
        </article>
        <article className="about-stat">
          <span>API host</span>
          <strong>{apiHealth.host}</strong>
        </article>
      </div>

      <p className="about-copy">{appInfo.updateMessage}</p>
      <p className="about-copy">{apiHealth.detail}</p>

      <div className="about-actions">
        <div className="about-link-row">
          <button
            type="button"
            className="primary-button subtle"
            onClick={handleCheckForUpdates}
            disabled={isChecking}
          >
            {isChecking ? 'Checking for updates...' : 'Check for updates'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              void checkApiHealth()
            }}
          >
            Check API reachability
          </button>
        </div>
        <div className="about-link-row">
          <a
            className="ghost-button about-link"
            href={desktopReleaseLinks.latestReleaseUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download latest build
          </a>
          <a
            className="ghost-button about-link"
            href={releaseNotesUrl}
            target="_blank"
            rel="noreferrer"
          >
            View release notes
          </a>
        </div>
        <span className="plan-hint">
          {appInfo.desktop
            ? 'Published GitHub releases will be discovered automatically in packaged builds.'
            : 'Open the packaged Windows app to test updater behavior end to end.'}
        </span>
      </div>
    </section>
  )
}
