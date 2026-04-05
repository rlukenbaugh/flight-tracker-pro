import type { SavedFlight } from '../types'
import { formatCurrency } from '../lib/flightUtils'

interface SavedFlightsPanelProps {
  flights: SavedFlight[]
}

export function SavedFlightsPanel({ flights }: SavedFlightsPanelProps) {
  return (
    <section className="panel saved-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Saved Flights & Alerts</span>
          <h2>Track watched options and price movement in one place</h2>
        </div>
      </div>

      {flights.length === 0 ? (
        <div className="empty-panel">
          <p>Save a flight from the results list to compare future price changes and alert triggers.</p>
        </div>
      ) : (
        <div className="saved-list">
          {flights.map((flight) => {
            const difference = flight.currentPrice - flight.savedPrice
            const indicator = difference === 0 ? 'stable' : difference < 0 ? 'down' : 'up'

            return (
              <article key={flight.id} className="saved-item">
                <div>
                  <strong>
                    {flight.airline} {flight.flightNumber}
                  </strong>
                  <span>
                    {flight.route} · {flight.cabinClass}
                  </span>
                </div>

                <div className="saved-prices">
                  <div>
                    <small>Saved</small>
                    <strong>{formatCurrency(flight.savedPrice)}</strong>
                  </div>
                  <div>
                    <small>Current</small>
                    <strong>{formatCurrency(flight.currentPrice)}</strong>
                  </div>
                  <div className={`price-change ${indicator}`}>
                    <small>Change</small>
                    <strong>
                      {difference === 0 ? '—' : `${difference > 0 ? '+' : ''}${formatCurrency(difference)}`}
                    </strong>
                  </div>
                </div>

                <div className="alert-tags">
                  {flight.alerts.map((alert) => (
                    <span key={alert}>{alert}</span>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
