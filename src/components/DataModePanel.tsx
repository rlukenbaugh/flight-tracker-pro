import type { AuthState } from '../types'

interface DataModePanelProps {
  liveEnabled: boolean
  authState: AuthState
  liveStatus: string
  weatherStatus: string
}

export function DataModePanel({
  liveEnabled,
  authState,
  liveStatus,
  weatherStatus,
}: DataModePanelProps) {
  return (
    <section className="panel data-mode-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Integration Status</span>
          <h2>Live data, auth, and premium plumbing are staged</h2>
        </div>
      </div>

      <div className="status-pill">Live pricing only</div>

      <div className="status-stack">
        <article>
          <span>Flight provider</span>
          <strong>{liveEnabled ? liveStatus : 'Live provider is not configured.'}</strong>
        </article>
        <article>
          <span>Weather</span>
          <strong>{weatherStatus}</strong>
        </article>
        <article>
          <span>Auth provider</span>
          <strong>{authState.provider === 'supabase' ? 'Supabase ready' : 'Local preview mode'}</strong>
        </article>
      </div>
    </section>
  )
}
