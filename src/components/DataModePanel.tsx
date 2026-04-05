import type { AuthState, DataMode } from '../types'

interface DataModePanelProps {
  dataMode: DataMode
  liveEnabled: boolean
  authState: AuthState
  liveStatus: string
  weatherStatus: string
  onChangeMode: (mode: DataMode) => void
}

export function DataModePanel({
  dataMode,
  liveEnabled,
  authState,
  liveStatus,
  weatherStatus,
  onChangeMode,
}: DataModePanelProps) {
  return (
    <section className="panel data-mode-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Integration Status</span>
          <h2>Live data, auth, and premium plumbing are staged</h2>
        </div>
      </div>

      <div className="segmented-control compact">
        {(['mock', 'live'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={dataMode === mode ? 'active' : ''}
            onClick={() => onChangeMode(mode)}
            disabled={mode === 'live' && !liveEnabled}
          >
            {mode === 'mock' ? 'Mock mode' : 'Live API mode'}
          </button>
        ))}
      </div>

      <div className="status-stack">
        <article>
          <span>Flight provider</span>
          <strong>{dataMode === 'live' ? liveStatus : 'Using curated mock inventory'}</strong>
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
