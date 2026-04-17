import type {
  AlertDeliverySettings,
  AlertEvent,
  AlertPreference,
  AuthState,
  NotificationPermissionState,
  SyncStatus,
} from '../types'

interface AlertCenterPanelProps {
  preferences: AlertPreference
  deliverySettings: AlertDeliverySettings
  alertFeed: AlertEvent[]
  authState: AuthState
  notificationPermission: NotificationPermissionState
  syncStatus: SyncStatus
  onTogglePreference: (key: keyof AlertPreference) => void
  onToggleDelivery: (key: keyof AlertDeliverySettings) => void
  onSendTestAlert: () => void
}

const labelByKey: Record<keyof AlertPreference, string> = {
  priceDrops: 'Price drops',
  directFlightAvailable: 'Direct flight becomes available',
  preferredAirlineDrop: 'Preferred airline drops in price',
  nearlySoldOut: 'Route is nearly sold out',
}

export function AlertCenterPanel({
  preferences,
  deliverySettings,
  alertFeed,
  authState,
  notificationPermission,
  syncStatus,
  onTogglePreference,
  onToggleDelivery,
  onSendTestAlert,
}: AlertCenterPanelProps) {
  return (
    <section className="panel alert-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Alert Center</span>
          <h2>Control the signals worth interrupting your day for</h2>
        </div>
        <span className="section-aside">
          {authState.user
            ? syncStatus === 'synced'
              ? 'Synced to account'
              : syncStatus === 'syncing'
                ? 'Syncing changes'
                : syncStatus === 'error'
                  ? 'Sync issue, local copy safe'
                  : 'Stored locally until Supabase sync is ready'
            : 'Stored locally until sign-in'}
        </span>
      </div>

      <div className="alert-settings-list">
        {(Object.keys(preferences) as Array<keyof AlertPreference>).map((key) => (
          <label key={key} className="toggle-row">
            <span>{labelByKey[key]}</span>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={() => onTogglePreference(key)}
            />
          </label>
        ))}
      </div>

      <div className="channel-grid">
        <article className="channel-card">
          <div className="section-intro">
            <div>
              <span className="eyebrow">Delivery</span>
              <h2>Route alerts into channels that actually reach you</h2>
            </div>
          </div>

          <div className="alert-settings-list">
            <label className="toggle-row">
              <span>In-app alert inbox</span>
              <input
                type="checkbox"
                checked={deliverySettings.inAppInbox}
                onChange={() => onToggleDelivery('inAppInbox')}
              />
            </label>
            <label className="toggle-row">
              <span>Desktop notifications</span>
              <input
                type="checkbox"
                checked={deliverySettings.desktopNotifications}
                onChange={() => onToggleDelivery('desktopNotifications')}
              />
            </label>
          </div>

          <p className="notification-status">
            Notification permission:{' '}
            <strong>{notificationPermission === 'unsupported' ? 'unsupported' : notificationPermission}</strong>
          </p>

          <button
            type="button"
            className="ghost-button"
            onClick={onSendTestAlert}
            disabled={!deliverySettings.inAppInbox && !deliverySettings.desktopNotifications}
          >
            Send test alert
          </button>
        </article>

        <article className="channel-card">
          <div className="section-intro">
            <div>
              <span className="eyebrow">Alert Feed</span>
              <h2>Latest delivered watch events</h2>
            </div>
          </div>

          {alertFeed.length === 0 ? (
            <div className="empty-panel compact-empty">
              <p>Saved flights and live price changes will start filling this feed automatically.</p>
            </div>
          ) : (
            <div className="alert-feed">
              {alertFeed.slice(0, 5).map((event) => (
                <article key={event.id} className="alert-feed-item">
                  <strong>{event.title}</strong>
                  <span>{event.route}</span>
                  <p>{event.message}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
