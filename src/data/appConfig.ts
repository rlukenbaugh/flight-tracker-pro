import type { AlertDeliverySettings, AlertPreference, PremiumPlan } from '../types'

export const desktopReleaseLinks = {
  repoUrl: 'https://github.com/rlukenbaugh/flight-tracker-pro',
  latestReleaseUrl: 'https://github.com/rlukenbaugh/flight-tracker-pro/releases/latest',
}

export const defaultAlertPreference: AlertPreference = {
  priceDrops: true,
  directFlightAvailable: true,
  preferredAirlineDrop: true,
  nearlySoldOut: false,
}

export const defaultAlertDeliverySettings: AlertDeliverySettings = {
  inAppInbox: true,
  desktopNotifications: false,
}

export const premiumPlans: PremiumPlan[] = [
  {
    id: 'core',
    name: 'Core',
    priceLabel: '$0',
    description: 'Fast search, scoring, filters, and saved comparisons.',
    features: [
      'Mock and live-ready flight search',
      'Flexible-date calendar and route scoring',
      'Up to 5 saved flight watches',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    priceLabel: '$19/mo',
    description: 'For frequent travelers who want faster alerts and better context.',
    features: [
      'Unlimited saved alerts',
      'Priority fare-drop push and email alerts',
      'Premium route comfort and delay intelligence',
      'Traveler profile preferences and airline weighting',
    ],
    highlighted: true,
  },
  {
    id: 'concierge',
    name: 'Concierge',
    priceLabel: '$79/mo',
    description: 'White-glove planning and richer trip economics for teams and power users.',
    features: [
      'Shared trips and team watchlists',
      'Agent-assisted route recommendations',
      'Seat map and baggage fee projections',
      'Dedicated support and premium onboarding',
    ],
  },
]

export const destinationCoordinates: Record<
  string,
  { latitude: number; longitude: number; city: string }
> = {
  DEN: { latitude: 39.8561, longitude: -104.6737, city: 'Denver' },
  DFW: { latitude: 32.8998, longitude: -97.0403, city: 'Dallas' },
  JFK: { latitude: 40.6413, longitude: -73.7781, city: 'New York' },
  LAX: { latitude: 33.9416, longitude: -118.4085, city: 'Los Angeles' },
  MIA: { latitude: 25.7959, longitude: -80.287, city: 'Miami' },
  SEA: { latitude: 47.4502, longitude: -122.3088, city: 'Seattle' },
  STT: { latitude: 18.3373, longitude: -64.9734, city: 'St. Thomas' },
}
