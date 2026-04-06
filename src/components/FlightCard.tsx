import type { FlightResult } from '../types'
import { formatCurrency, formatDuration, formatStops } from '../lib/flightUtils'

interface FlightCardProps {
  flight: FlightResult
  selected: boolean
  onSelect: () => void
  onToggleSave: () => void
  saved: boolean
}

export function FlightCard({
  flight,
  selected,
  onSelect,
  onToggleSave,
  saved,
}: FlightCardProps) {
  return (
    <article
      className={`flight-card${selected ? ' selected' : ''}`}
      data-testid="flight-card"
      data-airline={flight.airline}
      data-stops={String(flight.stops)}
      data-refundable={String(flight.refundable)}
      data-checked-bag={String(flight.checkedBagIncluded)}
    >
      <div className="flight-card-top">
        <div>
          <div className="flight-meta">
            <span>{flight.airline}</span>
            <span>{flight.flightNumber}</span>
            <span>{flight.cabinClass}</span>
            <span>{flight.fareProfile}</span>
          </div>
          <h3>{flight.dealLabel}</h3>
        </div>

        <div className="score-badge">
          <span>Flight Score</span>
          <strong>{flight.score}</strong>
        </div>
      </div>

      <div className="flight-timeline">
        <div>
          <strong>{flight.departureTime}</strong>
          <span>{flight.origin}</span>
        </div>
        <div className="timeline-track">
          <span>{formatDuration(flight.totalMinutes)}</span>
          <div />
          <small>{formatStops(flight.stops)}</small>
        </div>
        <div>
          <strong>{flight.arrivalTime}</strong>
          <span>{flight.destination}</span>
        </div>
      </div>

      <div className="flight-grid">
        <div>
          <span>Layover</span>
          <strong>{flight.layovers.length === 0 ? 'None' : flight.layovers.join(', ')}</strong>
        </div>
        <div>
          <span>Total price</span>
          <strong>{formatCurrency(flight.totalPrice)}</strong>
        </div>
        <div>
          <span>Per traveler</span>
          <strong>{formatCurrency(flight.pricePerTraveler)}</strong>
        </div>
        <div>
          <span>Refundability</span>
          <strong>{flight.refundable ? 'Refundable' : 'Non-refundable'}</strong>
        </div>
      </div>

      <div className="flight-tags">
        <span>{flight.carryOnIncluded ? 'Carry-on included' : 'Carry-on extra'}</span>
        <span>{flight.checkedBagIncluded ? 'Checked bag included' : 'Checked bag extra'}</span>
        <span>{flight.delayRisk} delay risk</span>
        <span>{flight.aircraft}</span>
      </div>

      {flight.warnings.length > 0 ? (
        <div className="flight-warning-list">
          {flight.warnings.slice(0, 2).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="flight-card-actions">
        <button type="button" className="ghost-button" onClick={onSelect}>
          View context
        </button>
        <button type="button" className="primary-button subtle" onClick={onToggleSave}>
          {saved ? 'Saved' : 'Save flight'}
        </button>
      </div>
    </article>
  )
}
