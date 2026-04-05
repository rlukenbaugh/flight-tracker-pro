import type { AlertPreference, AuthState } from '../types'

interface AlertCenterPanelProps {
  preferences: AlertPreference
  authState: AuthState
  onToggle: (key: keyof AlertPreference) => void
}

const labelByKey: Record<keyof AlertPreference, string> = {
  priceDrops: 'Price drops',
  directFlightAvailable: 'Direct flight becomes available',
  preferredAirlineDrop: 'Preferred airline drops in price',
  nearlySoldOut: 'Route is nearly sold out',
}

export function AlertCenterPanel({
  preferences,
  authState,
  onToggle,
}: AlertCenterPanelProps) {
  return (
    <section className="panel alert-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Alert Center</span>
          <h2>Control the signals worth interrupting your day for</h2>
        </div>
        <span className="section-aside">
          {authState.user ? 'Synced to account-ready state' : 'Stored locally until sign-in'}
        </span>
      </div>

      <div className="alert-settings-list">
        {(Object.keys(preferences) as Array<keyof AlertPreference>).map((key) => (
          <label key={key} className="toggle-row">
            <span>{labelByKey[key]}</span>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={() => onToggle(key)}
            />
          </label>
        ))}
      </div>
    </section>
  )
}
