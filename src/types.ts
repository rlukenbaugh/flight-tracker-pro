export type TripType = 'round-trip' | 'one-way'

export type CabinClass =
  | 'Economy'
  | 'Premium Economy'
  | 'Business'
  | 'First'

export type SortMode =
  | 'best-value'
  | 'cheapest'
  | 'fastest'
  | 'fewest-layovers'
  | 'airline-quality'
  | 'earliest-departure'
  | 'latest-departure'

export type TimeBucket =
  | 'early-morning'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'overnight'

export type TrendDirection = 'rising' | 'falling' | 'stable'

export interface SearchState {
  origin: string
  destination: string
  departureDate: string
  returnDate: string
  tripType: TripType
  travelers: number
  cabinClass: CabinClass
}

export interface RecentSearchEntry {
  id: string
  search: SearchState
  lastViewedAt: string
}

export type DataMode = 'mock' | 'live'

export interface FilterState {
  directOnly: boolean
  maxStops: 1 | 2
  preferredAirlines: string[]
  excludedAirlines: string[]
  departureWindows: TimeBucket[]
  arrivalWindows: TimeBucket[]
  maxDuration: number
  priceMin: number
  priceMax: number
  flexDays: 0 | 1 | 2 | 3
  refundableOnly: boolean
  bagsIncludedOnly: boolean
}

export interface FlightTemplate {
  id: string
  origin: string
  destination: string
  airline: string
  flightNumber: string
  departureTime: string
  arrivalTime: string
  totalMinutes: number
  stops: number
  layovers: string[]
  layoverMinutes: number[]
  baseFare: number
  airlineQuality: number
  delayRisk: 'Low' | 'Moderate' | 'Elevated'
  aircraft: string
  regionalAircraft: boolean
  overnightLayover: boolean
  seatComfort: 'tight' | 'standard' | 'spacious'
  terminalNote: string
  extrasEstimate: number
  fareProfile: 'Saver' | 'Standard' | 'Flex'
}

export interface RouteInsight {
  routeKey: string
  weekLowest: number
  monthLowest: number
  direction: TrendDirection
  weeklyChangePercent: number
  monthlyAverage: number
  recentAverage: number
  summary: string
  buyRecommendation: string
  historicalTip: string
  cheapestWeek: string
  weatherSummary: string
  timezoneDifference: string
  history: number[]
  calendar: CalendarPrice[]
}

export interface CalendarPrice {
  date: string
  price: number
  valueScore: number
}

export interface DestinationPoint {
  airport: string
  city: string
  x: number
  y: number
  price: number
  valueTag: string
  summary: string
}

export interface AirportOption {
  code: string
  city: string
  airport: string
  country: string
  state?: string
  metro?: string
  priority?: number
  aliases?: string[]
}

export interface FlightResult {
  id: string
  templateId: string
  origin: string
  destination: string
  airline: string
  flightNumber: string
  departureTime: string
  arrivalTime: string
  totalMinutes: number
  stops: number
  layovers: string[]
  layoverMinutes: number[]
  cabinClass: CabinClass
  totalPrice: number
  pricePerTraveler: number
  refundable: boolean
  carryOnIncluded: boolean
  checkedBagIncluded: boolean
  airlineQuality: number
  delayRisk: 'Low' | 'Moderate' | 'Elevated'
  aircraft: string
  regionalAircraft: boolean
  terminalNote: string
  estimatedBagFees: number
  estimatedExtras: number
  totalEstimatedTripCost: number
  warnings: string[]
  seatInsight: string
  fareProfile: 'Saver' | 'Standard' | 'Flex'
  score: number
  dealLabel: '🟢 Excellent Deal' | '🟡 Fair' | '🔴 Overpriced'
}

export interface SavedFlight {
  id: string
  templateId: string
  route: string
  airline: string
  flightNumber: string
  cabinClass: CabinClass
  savedPrice: number
  currentPrice: number
  alerts: string[]
}

export interface WeatherSnapshot {
  summary: string
  temperatureF: number
  windMph: number
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  status: 'guest' | 'loading' | 'authenticated'
  user: AuthUser | null
  provider: 'local' | 'supabase'
}

export interface AlertPreference {
  priceDrops: boolean
  directFlightAvailable: boolean
  preferredAirlineDrop: boolean
  nearlySoldOut: boolean
}

export interface AlertDeliverySettings {
  inAppInbox: boolean
  desktopNotifications: boolean
}

export type AlertEventKind =
  | 'price-drop'
  | 'direct-flight'
  | 'preferred-airline-drop'
  | 'nearly-sold-out'
  | 'test'

export interface AlertEvent {
  id: string
  kind: AlertEventKind
  title: string
  message: string
  route: string
  createdAt: string
}

export type SyncStatus = 'local-only' | 'syncing' | 'synced' | 'error'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

export interface PremiumPlan {
  id: 'core' | 'elite' | 'concierge'
  name: string
  priceLabel: string
  description: string
  features: string[]
  highlighted?: boolean
}

export type DesktopUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'unavailable'
  | 'error'

export interface DesktopAppInfo {
  version: string
  platform: string
  desktop: boolean
  packaged: boolean
  environment: string
  releaseChannel: 'preview' | 'stable' | 'beta'
  updateStatus: DesktopUpdateStatus
  updateMessage: string
}

export interface DesktopBridge {
  desktop: boolean
  platform: string
  getAppInfo?: () => Promise<DesktopAppInfo>
  checkForUpdates?: () => Promise<DesktopAppInfo>
}
