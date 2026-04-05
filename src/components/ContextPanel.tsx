import type { FlightResult, RouteInsight } from '../types'
import { formatCurrency, formatDuration } from '../lib/flightUtils'

interface ContextPanelProps {
  flight?: FlightResult
  insight?: RouteInsight
  recommendation: string
  weatherSummary?: string
}

export function ContextPanel({
  flight,
  insight,
  recommendation,
  weatherSummary,
}: ContextPanelProps) {
  if (!flight) {
    return (
      <aside className="panel context-panel empty-panel">
        <p>Select a flight to review trip context, hidden costs, and route quality warnings.</p>
      </aside>
    )
  }

  return (
    <aside className="panel context-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Travel Context Card</span>
          <h2>Decision support for the selected itinerary</h2>
        </div>
      </div>

      <div className="context-topline">
        <div>
          <span>{flight.airline}</span>
          <strong>{flight.flightNumber}</strong>
        </div>
        <div>
          <span>Total trip time</span>
          <strong>{formatDuration(flight.totalMinutes)}</strong>
        </div>
      </div>

      <div className="context-grid">
        <article>
          <span>Estimated baggage fees</span>
          <strong>{formatCurrency(flight.estimatedBagFees)}</strong>
        </article>
        <article>
          <span>Likely extras</span>
          <strong>{formatCurrency(flight.estimatedExtras)}</strong>
        </article>
        <article>
          <span>Total estimated trip cost</span>
          <strong>{formatCurrency(flight.totalEstimatedTripCost)}</strong>
        </article>
        <article>
          <span>Time zone shift</span>
          <strong>{insight?.timezoneDifference ?? '—'}</strong>
        </article>
      </div>

      <div className="context-list">
        <div>
          <span>Terminal changes</span>
          <p>{flight.terminalNote}</p>
        </div>
        <div>
          <span>Weather at destination</span>
          <p>{weatherSummary ?? insight?.weatherSummary ?? 'Weather service ready for integration.'}</p>
        </div>
        <div>
          <span>Seat and comfort read</span>
          <p>{flight.seatInsight}</p>
        </div>
      </div>

      <div className="recommendation-card">
        <span>Buy now or wait</span>
        <p>{recommendation}</p>
      </div>
    </aside>
  )
}
