import type { DestinationPoint } from '../types'
import { formatCurrency } from '../lib/flightUtils'

interface DestinationMapProps {
  origin: string
  selectedDestination: string
  destinations: DestinationPoint[]
  onSelectDestination: (destination: string) => void
  sourceLabel?: string
  emptyMessage?: string
}

export function DestinationMap({
  origin,
  selectedDestination,
  destinations,
  onSelectDestination,
  sourceLabel,
  emptyMessage,
}: DestinationMapProps) {
  if (destinations.length === 0) {
    return (
      <section className="panel map-panel empty-panel">
        <p>{emptyMessage ?? `Live destination pricing is not available from ${origin} yet.`}</p>
      </section>
    )
  }

  return (
    <section className="panel map-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Destination Map Explorer</span>
          <h2>Scan alternatives from {origin} without leaving the dashboard</h2>
        </div>
        <div>
          <p className="section-aside">Click any price marker to pivot the search.</p>
          {sourceLabel ? <p className="section-aside">{sourceLabel}</p> : null}
        </div>
      </div>

      <div className="map-surface">
        <svg viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="mapGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(163, 214, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(163, 214, 255, 0.04)" />
            </linearGradient>
          </defs>
          <path
            className="map-land"
            d="M6 18 L17 9 L30 8 L38 12 L51 10 L63 16 L74 16 L86 21 L92 32 L88 43 L78 49 L68 51 L59 47 L48 48 L37 45 L30 40 L17 39 L9 34 L6 18 Z"
          />
          <path
            className="map-route"
            d="M16 28 C30 18, 45 15, 76 41"
          />
          {destinations.map((point) => (
            <g key={point.airport}>
              <circle cx={point.x} cy={point.y} r="1.3" className="map-dot" />
              <text x={point.x + 1.8} y={point.y - 1.8} className="map-label">
                {point.airport}
              </text>
            </g>
          ))}
          <circle cx="16" cy="28" r="1.6" className="map-origin-dot" />
          <text x="18" y="26" className="map-label origin-label">
            {origin}
          </text>
        </svg>

        <div className="destination-list">
          {destinations.map((point) => (
            <button
              key={point.airport}
              type="button"
              className={`destination-chip${selectedDestination === point.airport ? ' active' : ''}`}
              onClick={() => onSelectDestination(point.airport)}
            >
              <div>
                <strong>
                  {point.city} <span>{point.airport}</span>
                </strong>
                <small>{point.summary}</small>
              </div>
              <div>
                <b>{formatCurrency(point.price)}</b>
                <small>{point.valueTag}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
