import type { RouteInsight } from '../types'
import { formatCurrency } from '../lib/flightUtils'

interface TrendChartProps {
  insight?: RouteInsight
  bestFare?: number
  sourceLabel?: string
  note?: string
  emptyMessage?: string
}

export function TrendChart({ insight, bestFare, sourceLabel, note, emptyMessage }: TrendChartProps) {
  if (!insight) {
    return (
      <section className="panel trend-panel empty-panel">
        <p>{emptyMessage ?? 'Select a supported route to unlock fare history and trend intelligence.'}</p>
      </section>
    )
  }

  const max = Math.max(...insight.history)
  const min = Math.min(...insight.history)
  const points = insight.history
    .map((price, index) => {
      const x = (index / (insight.history.length - 1)) * 100
      const y = ((max - price) / Math.max(1, max - min)) * 64 + 8
      return `${x},${y}`
    })
    .join(' ')

  return (
    <section className="panel trend-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Price Trend Intelligence</span>
          <h2>Know whether this fare is moving in your favor</h2>
        </div>
        <div>
          <div className={`trend-pill trend-${insight.direction}`}>{insight.direction}</div>
          {sourceLabel ? <p className="section-aside">{sourceLabel}</p> : null}
        </div>
      </div>

      <div className="trend-stats">
        <article>
          <span>Lowest in 7 days</span>
          <strong>{formatCurrency(insight.weekLowest)}</strong>
        </article>
        <article>
          <span>Lowest in 30 days</span>
          <strong>{formatCurrency(insight.monthLowest)}</strong>
        </article>
        <article>
          <span>Recent average</span>
          <strong>{formatCurrency(insight.recentAverage)}</strong>
        </article>
        <article>
          <span>Best live fare</span>
          <strong>{bestFare ? formatCurrency(bestFare) : '—'}</strong>
        </article>
      </div>

      <div className="trend-graph">
        <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(129, 210, 255, 0.75)" />
              <stop offset="100%" stopColor="rgba(129, 210, 255, 0.04)" />
            </linearGradient>
          </defs>
          <path d="M0 76 H100" className="trend-axis" />
          <path d={`M${points} L100,76 L0,76 Z`} fill="url(#trendGradient)" className="trend-area" />
          <polyline points={points} className="trend-line" />
        </svg>
      </div>

      <div className="trend-copy">
        <p>{insight.summary}</p>
        {note ? <p>{note}</p> : null}
        <p>{insight.historicalTip}</p>
      </div>
    </section>
  )
}
