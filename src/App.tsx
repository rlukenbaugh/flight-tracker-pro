import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import './App.css'
import { AboutPanel } from './components/AboutPanel'
import { AlertCenterPanel } from './components/AlertCenterPanel'
import { AuthPanel } from './components/AuthPanel'
import { ContextPanel } from './components/ContextPanel'
import { DataModePanel } from './components/DataModePanel'
import { DateHeatmap } from './components/DateHeatmap'
import { DestinationMap } from './components/DestinationMap'
import { FlightCard } from './components/FlightCard'
import { PremiumPlansPanel } from './components/PremiumPlansPanel'
import { SavedFlightsPanel } from './components/SavedFlightsPanel'
import { TrendChart } from './components/TrendChart'
import {
  defaultAlertPreference,
  premiumPlans,
} from './data/appConfig'
import {
  airportOptions,
  destinationExplorerByOrigin,
  flightTemplates,
  routeInsights,
} from './data/mockData'
import {
  buildDefaultFilters,
  buildRouteRecommendation,
  createFlightResults,
  filterFlights,
  formatCurrency,
  formatDuration,
  getRouteKey,
  sortFlights,
} from './lib/flightUtils'
import { fetchDestinationWeather, searchLiveFlights } from './lib/liveData'
import {
  readAlertPreference,
  readLocalAuthState,
  readSavedFlights,
  writeAlertPreference,
  writeLocalAuthState,
  writeSavedFlights,
} from './lib/storage'
import { getAuthStateFromSession, supabase } from './lib/supabase'
import type {
  AlertPreference,
  AuthState,
  CabinClass,
  DataMode,
  FilterState,
  FlightResult,
  SavedFlight,
  SearchState,
  SortMode,
  TimeBucket,
  TripType,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

const cabinOptions: CabinClass[] = ['Economy', 'Premium Economy', 'Business', 'First']
const tripOptions: TripType[] = ['round-trip', 'one-way']
const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'best-value', label: 'Best overall value' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'fewest-layovers', label: 'Fewest layovers' },
  { value: 'airline-quality', label: 'Airline quality' },
  { value: 'earliest-departure', label: 'Earliest departure' },
  { value: 'latest-departure', label: 'Latest departure' },
]
const timeWindowOptions: { value: TimeBucket; label: string }[] = [
  { value: 'early-morning', label: 'Early morning' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'overnight', label: 'Overnight' },
]

function addDaysToIso(baseIso: string, offset: number) {
  const date = new Date(`${baseIso}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function differenceInDays(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`)
  const endDate = new Date(`${end}T12:00:00`)
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS))
}

function createDefaultSearch(): SearchState {
  const departure = new Date()
  departure.setHours(0, 0, 0, 0)
  departure.setDate(departure.getDate() + 18)

  const returnDate = new Date(departure.getTime() + 4 * DAY_MS)

  return {
    origin: 'DFW',
    destination: 'MIA',
    departureDate: departure.toISOString().slice(0, 10),
    returnDate: returnDate.toISOString().slice(0, 10),
    tripType: 'round-trip',
    travelers: 2,
    cabinClass: 'Economy',
  }
}

function clampFilters(filters: FilterState, maxPrice: number): FilterState {
  return {
    ...filters,
    priceMin: Math.min(filters.priceMin, maxPrice),
    priceMax: Math.max(filters.priceMin + 50, Math.min(filters.priceMax, maxPrice)),
  }
}

function App() {
  const defaultSearch = createDefaultSearch()
  const [draftSearch, setDraftSearch] = useState<SearchState>(defaultSearch)
  const [search, setSearch] = useState<SearchState>(defaultSearch)
  const [filters, setFilters] = useState<FilterState>(buildDefaultFilters())
  const [sortMode, setSortMode] = useState<SortMode>('best-value')
  const [selectedFlightId, setSelectedFlightId] = useState('')
  const [savedFlights, setSavedFlights] = useState<SavedFlight[]>(() => readSavedFlights())
  const [alertPreference, setAlertPreference] = useState<AlertPreference>(() =>
    readAlertPreference(defaultAlertPreference),
  )
  const [authState, setAuthState] = useState<AuthState>(() => readLocalAuthState())
  const [authEmail, setAuthEmail] = useState(() => readLocalAuthState().user?.email ?? '')
  const [authMessage, setAuthMessage] = useState<string>()
  const [dataMode, setDataMode] = useState<DataMode>(
    import.meta.env.VITE_ENABLE_LIVE_FLIGHTS === 'true' ? 'live' : 'mock',
  )
  const [liveFlights, setLiveFlights] = useState<FlightResult[]>([])
  const [liveStatus, setLiveStatus] = useState(
    'Live flights disabled until API env vars are configured.',
  )
  const [weatherSummary, setWeatherSummary] = useState<string>()
  const [weatherStatus, setWeatherStatus] = useState('Ready for live weather lookup.')
  const [isPending, startTransition] = useTransition()

  const activeRouteKey = getRouteKey(search.origin, search.destination)
  const routeInsight = routeInsights[activeRouteKey]
  const activeTemplates = flightTemplates.filter(
    (flight) => flight.origin === search.origin && flight.destination === search.destination,
  )
  const routeResults =
    activeTemplates.length > 0
      ? createFlightResults(activeTemplates, search, routeInsight, filters.flexDays)
      : []
  const availableResults =
    dataMode === 'live' && liveFlights.length > 0 ? liveFlights : routeResults
  const priceCap = Math.max(
    600,
    ...availableResults.map((flight) => flight.pricePerTraveler),
  )
  const activeFilters = clampFilters(filters, priceCap)
  const rankedResults = sortFlights(filterFlights(availableResults, activeFilters), sortMode)
  const deferredResults = useDeferredValue(rankedResults)
  const selectedFlight =
    deferredResults.find((flight) => flight.id === selectedFlightId) ?? deferredResults[0]
  const bestFlight = rankedResults[0]
  const explorerDestinations = destinationExplorerByOrigin[search.origin] ?? []
  const fallbackAirlineTemplates =
    activeTemplates.length > 0
      ? activeTemplates
      : flightTemplates.filter((flight) => flight.origin === search.origin)
  const airlineOptions = Array.from(
    new Set(fallbackAirlineTemplates.map((flight) => flight.airline)),
  ).sort()
  const savedFlightsWithLivePrices = savedFlights.map((saved) => {
    const live = availableResults.find(
      (flight) =>
        flight.templateId === saved.templateId && flight.cabinClass === saved.cabinClass,
    )

    return {
      ...saved,
      currentPrice: live?.totalPrice ?? saved.currentPrice,
    }
  })

  useEffect(() => {
    writeSavedFlights(savedFlights)
  }, [savedFlights])

  useEffect(() => {
    writeAlertPreference(alertPreference)
  }, [alertPreference])

  useEffect(() => {
    if (authState.provider === 'local') {
      writeLocalAuthState(authState)
    }
  }, [authState])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setAuthState(getAuthStateFromSession(data.session))
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(getAuthStateFromSession(session))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (dataMode !== 'live' || import.meta.env.VITE_ENABLE_LIVE_FLIGHTS !== 'true') {
      return
    }

    searchLiveFlights(search, filters.flexDays)
      .then((flights) => {
        if (!cancelled) {
          setLiveFlights(flights)
          setLiveStatus(
            flights.length > 0
              ? `Loaded ${flights.length} live flight offers from the configured provider.`
              : 'Live provider returned no offers for this route.',
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLiveFlights([])
          setLiveStatus(
            error instanceof Error
              ? `${error.message}. Falling back to mock inventory.`
              : 'Live provider request failed. Falling back to mock inventory.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [dataMode, filters.flexDays, search])

  useEffect(() => {
    let cancelled = false

    fetchDestinationWeather(search.destination)
      .then((weather) => {
        if (!cancelled) {
          setWeatherSummary(weather?.summary)
          setWeatherStatus(weather ? 'Live destination weather loaded.' : 'No live weather available.')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeatherSummary(undefined)
          setWeatherStatus('Weather lookup unavailable, using route defaults.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [search.destination])

  function updateDraftSearch<Key extends keyof SearchState>(key: Key, value: SearchState[Key]) {
    setDraftSearch((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateSearch(nextSearch: SearchState) {
    startTransition(() => {
      setSearch({
        ...nextSearch,
        origin: nextSearch.origin.toUpperCase(),
        destination: nextSearch.destination.toUpperCase(),
      })
      setSelectedFlightId('')
    })
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearch(draftSearch)
  }

  function handleLocalSignIn() {
    if (!authEmail.trim()) {
      setAuthMessage('Enter an email address first to preview a signed-in state.')
      return
    }

    const nextState: AuthState = {
      status: 'authenticated',
      provider: 'local',
      user: {
        id: 'local-preview-user',
        email: authEmail.trim(),
      },
    }

    setAuthState(nextState)
    setAuthMessage('Preview sign-in enabled. Supabase can replace this as soon as env vars are present.')
  }

  async function handleMagicLink() {
    if (!supabase) {
      setAuthMessage('Supabase env vars are missing, so magic link sign-in is disabled.')
      return
    }

    if (!authEmail.trim()) {
      setAuthMessage('Enter an email address to send a magic link.')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
    })

    setAuthMessage(
      error
        ? `Magic link failed: ${error.message}`
        : 'Magic link sent. Check your inbox to complete sign-in.',
    )
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setAuthState({
      status: 'guest',
      user: null,
      provider: supabase ? 'supabase' : 'local',
    })
    setAuthMessage('Signed out. Saved watches remain available locally.')
  }

  function swapAirports() {
    setDraftSearch((current) => ({
      ...current,
      origin: current.destination,
      destination: current.origin,
    }))
  }

  function applyDestination(destination: string) {
    const nextSearch = {
      ...search,
      destination,
    }

    setDraftSearch(nextSearch)
    updateSearch(nextSearch)
  }

  function applyHeatmapDate(date: string) {
    const adjustedReturn =
      search.tripType === 'round-trip'
        ? addDaysToIso(date, differenceInDays(search.departureDate, search.returnDate))
        : search.returnDate
    const nextSearch = {
      ...search,
      departureDate: date,
      returnDate: adjustedReturn,
    }

    setDraftSearch(nextSearch)
    updateSearch(nextSearch)
  }

  function toggleWindow(kind: 'departureWindows' | 'arrivalWindows', value: TimeBucket) {
    setFilters((current) => ({
      ...current,
      [kind]: current[kind].includes(value)
        ? current[kind].filter((item) => item !== value)
        : [...current[kind], value],
    }))
  }

  function toggleAirline(kind: 'preferredAirlines' | 'excludedAirlines', airline: string) {
    const inverseKind = kind === 'preferredAirlines' ? 'excludedAirlines' : 'preferredAirlines'
    setFilters((current) => ({
      ...current,
      [kind]: current[kind].includes(airline)
        ? current[kind].filter((item) => item !== airline)
        : [...current[kind], airline],
      [inverseKind]: current[inverseKind].filter((item) => item !== airline),
    }))
  }

  function toggleAlertSetting(key: keyof AlertPreference) {
    setAlertPreference((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  function toggleSaveFlight(flight: FlightResult) {
    setSavedFlights((current) => {
      const exists = current.some((item) => item.id === flight.id)
      if (exists) {
        return current.filter((item) => item.id !== flight.id)
      }

      return [
        {
          id: flight.id,
          templateId: flight.templateId,
          route: `${flight.origin} → ${flight.destination}`,
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          cabinClass: flight.cabinClass,
          savedPrice: flight.totalPrice,
          currentPrice: flight.totalPrice,
          alerts: [
            alertPreference.priceDrops ? 'Price drop alert' : null,
            alertPreference.directFlightAvailable ? 'Direct flight becomes available' : null,
            alertPreference.preferredAirlineDrop ? 'Preferred airline price watch' : null,
            alertPreference.nearlySoldOut ? 'Nearly sold out monitor' : null,
          ].filter((value): value is string => Boolean(value)),
        },
        ...current,
      ]
    })
  }

  const recommendation = buildRouteRecommendation(routeInsight, bestFlight)
  const bestLiveFare = bestFlight ? formatCurrency(bestFlight.pricePerTraveler) : '—'
  const displayedLiveStatus =
    dataMode !== 'live' || import.meta.env.VITE_ENABLE_LIVE_FLIGHTS !== 'true'
      ? 'Using curated mock inventory.'
      : liveStatus
  const resultsSummary =
    deferredResults.length > 0
      ? `${deferredResults.length} flights ranked for ${search.origin} to ${search.destination}`
      : 'No flights match the current filter stack'
  const selectedSaved = selectedFlight
    ? savedFlightsWithLivePrices.some((item) => item.id === selectedFlight.id)
    : false

  return (
    <div className="app-shell">
      <header className="hero-shell">
        <div className="hero-background" aria-hidden="true" />

        <div className="topbar">
          <div>
            <span className="brand-kicker">Flight Tracker Pro</span>
            <strong>Travel intelligence for confident booking decisions</strong>
          </div>
          <div className="status-cluster">
            <span className="status-pill">Premium dashboard</span>
            <span className="status-pill subtle">
              {dataMode === 'live' ? 'Live-capable mode' : 'Mock-safe mode'}
            </span>
          </div>
        </div>

        <section className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Smart flight intelligence dashboard</span>
            <h1>Search, score, compare, and decide with less guesswork.</h1>
            <p>
              Flight Tracker Pro turns raw fare options into a premium decision surface with ranking
              logic, flexible-date heatmaps, buy-or-wait guidance, route quality signals, and now an
              API-ready path for auth, alerts, and subscriptions.
            </p>

            <div className="hero-metrics">
              <article>
                <span>Best live fare</span>
                <strong>{bestLiveFare}</strong>
              </article>
              <article>
                <span>Cheapest week</span>
                <strong>{routeInsight?.cheapestWeek ?? 'Search a supported route'}</strong>
              </article>
              <article>
                <span>Top score</span>
                <strong>{bestFlight ? `${bestFlight.score}/100` : '—'}</strong>
              </article>
            </div>

            <div className="hero-caption">
              <span>{dataMode === 'live' ? 'Live API mode' : 'Mock mode'}</span>
              <span>{displayedLiveStatus}</span>
            </div>
          </div>

          <form className="search-panel" onSubmit={handleSearchSubmit}>
            <div className="search-header">
              <div>
                <span className="eyebrow">Flight Search</span>
                <h2>Build the route you want to evaluate</h2>
              </div>
              <button type="button" className="ghost-button" onClick={swapAirports}>
                Swap airports
              </button>
            </div>

            <div className="trip-switch">
              {tripOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={draftSearch.tripType === option ? 'active' : ''}
                  onClick={() => updateDraftSearch('tripType', option)}
                >
                  {option === 'round-trip' ? 'Round-trip' : 'One-way'}
                </button>
              ))}
            </div>

            <div className="search-grid">
              <label>
                <span>Origin airport</span>
                <input
                  list="airport-options"
                  value={draftSearch.origin}
                  onChange={(event) => updateDraftSearch('origin', event.target.value.toUpperCase())}
                />
              </label>
              <label>
                <span>Destination airport</span>
                <input
                  list="airport-options"
                  value={draftSearch.destination}
                  onChange={(event) =>
                    updateDraftSearch('destination', event.target.value.toUpperCase())
                  }
                />
              </label>
              <label>
                <span>Departure date</span>
                <input
                  type="date"
                  value={draftSearch.departureDate}
                  onChange={(event) => updateDraftSearch('departureDate', event.target.value)}
                />
              </label>
              {draftSearch.tripType === 'round-trip' ? (
                <label>
                  <span>Return date</span>
                  <input
                    type="date"
                    min={draftSearch.departureDate}
                    value={draftSearch.returnDate}
                    onChange={(event) => updateDraftSearch('returnDate', event.target.value)}
                  />
                </label>
              ) : (
                <label className="disabled-field">
                  <span>Return date</span>
                  <input type="text" value="One-way search" disabled />
                </label>
              )}
              <label>
                <span>Travelers</span>
                <select
                  value={draftSearch.travelers}
                  onChange={(event) => updateDraftSearch('travelers', Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count} traveler{count > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Cabin class</span>
                <select
                  value={draftSearch.cabinClass}
                  onChange={(event) =>
                    updateDraftSearch('cabinClass', event.target.value as CabinClass)
                  }
                >
                  {cabinOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="search-footer">
              <p>
                Searches can use curated mock fares or switch to a live provider path when the API
                layer is configured.
              </p>
              <button type="submit" className="primary-button">
                {isPending ? 'Refreshing route...' : 'Search flights'}
              </button>
            </div>
          </form>
        </section>
      </header>

      <main className="workspace">
        <aside className="filters-panel">
          <div className="section-intro">
            <div>
              <span className="eyebrow">Filters</span>
              <h2>Narrow the field fast</h2>
            </div>
          </div>

          <div className="filter-group">
            <label className="toggle-row">
              <span>Direct flights only</span>
              <input
                type="checkbox"
                checked={filters.directOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, directOnly: event.target.checked }))
                }
              />
            </label>
            <label className="toggle-row">
              <span>Refundable only</span>
              <input
                type="checkbox"
                checked={filters.refundableOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, refundableOnly: event.target.checked }))
                }
              />
            </label>
            <label className="toggle-row">
              <span>Bags included only</span>
              <input
                type="checkbox"
                checked={filters.bagsIncludedOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, bagsIncludedOnly: event.target.checked }))
                }
              />
            </label>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Layovers</span>
              <strong>{filters.maxStops === 1 ? 'Max 1 stop' : 'Up to 2 stops'}</strong>
            </div>
            <div className="segmented-control">
              {[1, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.maxStops === value ? 'active' : ''}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      maxStops: value as 1 | 2,
                    }))
                  }
                >
                  {value === 1 ? 'Maximum 1 stop' : 'Allow 2 stops'}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Price per traveler</span>
              <strong>
                {formatCurrency(activeFilters.priceMin)} – {formatCurrency(activeFilters.priceMax)}
              </strong>
            </div>
            <label className="range-row">
              <span>Minimum</span>
              <input
                type="range"
                min="80"
                max={String(priceCap)}
                value={activeFilters.priceMin}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    priceMin: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="range-row">
              <span>Maximum</span>
              <input
                type="range"
                min="120"
                max={String(priceCap)}
                value={activeFilters.priceMax}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    priceMax: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Maximum trip duration</span>
              <strong>{formatDuration(filters.maxDuration)}</strong>
            </div>
            <input
              type="range"
              min="120"
              max="900"
              step="30"
              value={filters.maxDuration}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  maxDuration: Number(event.target.value),
                }))
              }
            />
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Flexible date range</span>
              <strong>±{filters.flexDays} days</strong>
            </div>
            <div className="segmented-control compact">
              {[0, 1, 2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.flexDays === value ? 'active' : ''}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      flexDays: value as 0 | 1 | 2 | 3,
                    }))
                  }
                >
                  ±{value}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Departure time</span>
              <strong>{filters.departureWindows.length || 'Any'}</strong>
            </div>
            <div className="chip-grid">
              {timeWindowOptions.map((option) => (
                <button
                  key={`departure-${option.value}`}
                  type="button"
                  className={filters.departureWindows.includes(option.value) ? 'active' : ''}
                  onClick={() => toggleWindow('departureWindows', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Arrival time</span>
              <strong>{filters.arrivalWindows.length || 'Any'}</strong>
            </div>
            <div className="chip-grid">
              {timeWindowOptions.map((option) => (
                <button
                  key={`arrival-${option.value}`}
                  type="button"
                  className={filters.arrivalWindows.includes(option.value) ? 'active' : ''}
                  onClick={() => toggleWindow('arrivalWindows', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Preferred airlines</span>
              <strong>{filters.preferredAirlines.length || 'Any'}</strong>
            </div>
            <div className="airline-stack">
              {airlineOptions.map((airline) => (
                <button
                  key={`preferred-${airline}`}
                  type="button"
                  className={filters.preferredAirlines.includes(airline) ? 'active' : ''}
                  onClick={() => toggleAirline('preferredAirlines', airline)}
                >
                  {airline}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title-row">
              <span>Exclude airlines</span>
              <strong>{filters.excludedAirlines.length || 'None'}</strong>
            </div>
            <div className="airline-stack muted">
              {airlineOptions.map((airline) => (
                <button
                  key={`excluded-${airline}`}
                  type="button"
                  className={filters.excludedAirlines.includes(airline) ? 'active' : ''}
                  onClick={() => toggleAirline('excludedAirlines', airline)}
                >
                  {airline}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="content-column">
          <div className="results-toolbar">
            <div>
              <span className="eyebrow">Results View</span>
              <h2>{resultsSummary}</h2>
              <p>
                Ranked by {sortOptions.find((option) => option.value === sortMode)?.label.toLowerCase()}.
                {' '}
                {routeInsight?.summary ??
                  'Switch to a supported route like DFW → MIA, DFW → DEN, or JFK → LAX.'}
              </p>
            </div>

            <label className="sort-select">
              <span>Sort by</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="intel-grid">
            <TrendChart insight={routeInsight} bestFare={bestFlight?.pricePerTraveler} />
            <ContextPanel
              flight={selectedFlight}
              insight={routeInsight}
              recommendation={recommendation}
              weatherSummary={weatherSummary}
            />
          </div>

          <div className="support-grid">
            <DataModePanel
              dataMode={dataMode}
              liveEnabled={import.meta.env.VITE_ENABLE_LIVE_FLIGHTS === 'true'}
              authState={authState}
              liveStatus={displayedLiveStatus}
              weatherStatus={weatherStatus}
              onChangeMode={setDataMode}
            />
            <AuthPanel
              authState={authState}
              email={authEmail}
              message={authMessage}
              onEmailChange={setAuthEmail}
              onLocalSignIn={handleLocalSignIn}
              onMagicLink={handleMagicLink}
              onSignOut={handleSignOut}
              supabaseEnabled={Boolean(supabase)}
            />
            <AboutPanel />
          </div>

          {routeInsight ? (
            <DateHeatmap
              calendar={routeInsight.calendar}
              selectedDate={search.departureDate}
              cheapestWeek={routeInsight.cheapestWeek}
              onSelectDate={applyHeatmapDate}
            />
          ) : null}

          <DestinationMap
            origin={search.origin}
            selectedDestination={search.destination}
            destinations={explorerDestinations}
            onSelectDestination={applyDestination}
          />

          <SavedFlightsPanel flights={savedFlightsWithLivePrices} />

          <div className="support-grid">
            <AlertCenterPanel
              preferences={alertPreference}
              authState={authState}
              onToggle={toggleAlertSetting}
            />
            <PremiumPlansPanel plans={premiumPlans} />
          </div>

          <section className="results-list">
            {deferredResults.length > 0 ? (
              deferredResults.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  selected={selectedFlight?.id === flight.id}
                  onSelect={() => setSelectedFlightId(flight.id)}
                  onToggleSave={() => toggleSaveFlight(flight)}
                  saved={savedFlightsWithLivePrices.some((saved) => saved.id === flight.id)}
                />
              ))
            ) : (
              <div className="panel empty-panel">
                <h3>No flights match this stack</h3>
                <p>
                  Try widening the price range, allowing one stop, or switching to one of the map
                  explorer destinations.
                </p>
              </div>
            )}
          </section>

          {selectedFlight ? (
            <div className="results-footer">
              <span className="eyebrow">Selected flight snapshot</span>
              <p>
                {selectedFlight.airline} {selectedFlight.flightNumber} is currently{' '}
                {selectedFlight.dealLabel.toLowerCase()} at {formatCurrency(selectedFlight.totalPrice)}.
                {' '}
                {selectedSaved ? 'This option is already saved for alerts.' : 'Save it to track changes.'}
              </p>
            </div>
          ) : null}

          <section className="next-steps-panel">
            <span className="eyebrow">Build next</span>
            <h2>Choose the next layer for Flight Tracker Pro</h2>
            <div className="next-step-grid">
              <article>1. real API integrations</article>
              <article>2. authentication and saved alerts</article>
              <article>3. mobile optimization</article>
              <article>4. premium subscription features</article>
            </div>
          </section>
        </section>
      </main>

      <datalist id="airport-options">
        {airportOptions.map((airport) => (
          <option key={airport} value={airport} />
        ))}
      </datalist>
    </div>
  )
}

export default App
