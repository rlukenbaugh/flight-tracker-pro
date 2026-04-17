import type { RecentSearchEntry, SyncStatus } from '../types'

interface RecentSearchesPanelProps {
  searches: RecentSearchEntry[]
  syncStatus: SyncStatus
  onSelect: (entry: RecentSearchEntry) => void
}

function formatSearchDate(entry: RecentSearchEntry) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${entry.search.departureDate}T12:00:00`))
}

function formatLastViewed(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function RecentSearchesPanel({
  searches,
  syncStatus,
  onSelect,
}: RecentSearchesPanelProps) {
  return (
    <section className="panel recent-searches-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Recent Searches</span>
          <h2>Resume the last routes you were actively comparing</h2>
        </div>
        <span className="section-aside">
          {syncStatus === 'synced' ? 'Restored across devices' : 'Latest searches kept locally'}
        </span>
      </div>

      {searches.length === 0 ? (
        <div className="empty-panel compact-empty">
          <p>Search a route once and it will appear here for quick reuse.</p>
        </div>
      ) : (
        <div className="history-list">
          {searches.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="history-item"
              data-testid={`recent-search-${entry.id}`}
              onClick={() => onSelect(entry)}
            >
              <div>
                <strong>
                  {entry.search.origin} → {entry.search.destination}
                </strong>
                <span>
                  {entry.search.tripType === 'round-trip' ? 'Round-trip' : 'One-way'} ·{' '}
                  {entry.search.cabinClass} · {entry.search.travelers} traveler
                  {entry.search.travelers > 1 ? 's' : ''}
                </span>
              </div>
              <div className="history-meta">
                <small>{formatSearchDate(entry)}</small>
                <small>Viewed {formatLastViewed(entry.lastViewedAt)}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
