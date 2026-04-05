import type { AlertPreference, AuthState, SavedFlight } from '../types'

const SAVED_FLIGHTS_KEY = 'flight-tracker-pro:saved-flights'
const ALERT_PREFS_KEY = 'flight-tracker-pro:alert-preferences'
const AUTH_KEY = 'flight-tracker-pro:auth-state'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

export function readSavedFlights() {
  return readJson<SavedFlight[]>(SAVED_FLIGHTS_KEY, [])
}

export function writeSavedFlights(value: SavedFlight[]) {
  writeJson(SAVED_FLIGHTS_KEY, value)
}

export function readAlertPreference(fallback: AlertPreference) {
  return readJson<AlertPreference>(ALERT_PREFS_KEY, fallback)
}

export function writeAlertPreference(value: AlertPreference) {
  writeJson(ALERT_PREFS_KEY, value)
}

export function readLocalAuthState() {
  return readJson<AuthState>(AUTH_KEY, {
    status: 'guest',
    user: null,
    provider: 'local',
  })
}

export function writeLocalAuthState(value: AuthState) {
  writeJson(AUTH_KEY, value)
}
