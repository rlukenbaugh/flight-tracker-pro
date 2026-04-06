import type { CSSProperties } from 'react'
import type { CalendarPrice } from '../types'
import { formatCurrency } from '../lib/flightUtils'

interface DateHeatmapProps {
  calendar: CalendarPrice[]
  selectedDate: string
  cheapestWeek: string
  onSelectDate: (date: string) => void
  sourceLabel?: string
  emptyMessage?: string
}

function labelDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function DateHeatmap({
  calendar,
  selectedDate,
  cheapestWeek,
  onSelectDate,
  sourceLabel,
  emptyMessage,
}: DateHeatmapProps) {
  if (calendar.length === 0) {
    return (
      <section className="panel heatmap-panel empty-panel">
        <p>{emptyMessage ?? 'Live cheapest-date pricing is not available for this search yet.'}</p>
      </section>
    )
  }

  const min = Math.min(...calendar.map((day) => day.price))
  const max = Math.max(...calendar.map((day) => day.price))

  return (
    <section className="panel heatmap-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Flexible Date Price Map</span>
          <h2>Spot the lowest and smartest days up to 12 weeks out</h2>
        </div>
        <div>
          <p className="section-aside">Cheapest week: {cheapestWeek}</p>
          {sourceLabel ? <p className="section-aside">{sourceLabel}</p> : null}
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Higher</span>
        <div className="heatmap-scale" aria-hidden="true">
          <span className="heat-high" />
          <span className="heat-mid" />
          <span className="heat-low" />
        </div>
        <span>Lower</span>
      </div>

      <div className="heatmap-grid" role="list">
        {calendar.map((day) => {
          const intensity = (max - day.price) / Math.max(1, max - min)
          const tone = {
            '--heat-opacity': (0.16 + intensity * 0.72).toFixed(2),
          } as CSSProperties & Record<'--heat-opacity', string>
          const isBestValue = day.valueScore >= 92

          return (
            <button
              key={day.date}
              className={`heatmap-day${day.date === selectedDate ? ' selected' : ''}${isBestValue ? ' best-value' : ''}`}
              style={tone}
              type="button"
              onClick={() => onSelectDate(day.date)}
            >
              <span>{labelDate(day.date)}</span>
              <strong>{formatCurrency(day.price)}</strong>
              <small>{isBestValue ? 'Best live value' : 'Live fare sample'}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}
