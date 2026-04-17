import type { AlertPreference, RecentSearchEntry, SavedFlight, SearchState } from '../types'
import { buildApiUrl } from './runtimeConfig'
import { supabase } from './supabase'

interface CloudUserStateResponse {
  savedFlights?: SavedFlight[]
  alertPreference?: AlertPreference
  savedSearch?: SearchState
  recentSearches?: RecentSearchEntry[]
}

interface CloudUserStatePayload {
  savedFlights?: SavedFlight[]
  alertPreference?: AlertPreference
  savedSearch?: SearchState
}

async function getAccessToken() {
  if (!supabase) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function authorizedFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken()
  if (!token) {
    return null
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
}

export async function loadCloudUserState(): Promise<CloudUserStateResponse | null> {
  const response = await authorizedFetch('/api/user-state')
  if (!response) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Cloud state load failed with status ${response.status}`)
  }

  return (await response.json()) as CloudUserStateResponse
}

export async function syncCloudUserState(payload: CloudUserStatePayload) {
  const response = await authorizedFetch('/api/user-state', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!response) {
    return
  }

  if (!response.ok) {
    throw new Error(`Cloud state sync failed with status ${response.status}`)
  }
}
