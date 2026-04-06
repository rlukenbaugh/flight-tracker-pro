/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_LIVE_FLIGHTS?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_ENVIRONMENT?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_STRIPE_PAYMENT_LINK_ELITE?: string
  readonly VITE_STRIPE_PAYMENT_LINK_CONCIERGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  flightTrackerDesktop?: {
    desktop: boolean
    platform: string
    getAppInfo?: () => Promise<{
      version: string
      platform: string
      desktop: boolean
      packaged: boolean
      environment: string
      releaseChannel: 'preview' | 'stable' | 'beta'
      updateStatus:
        | 'idle'
        | 'checking'
        | 'available'
        | 'downloading'
        | 'downloaded'
        | 'not-available'
        | 'unavailable'
        | 'error'
      updateMessage: string
    }>
    checkForUpdates?: () => Promise<{
      version: string
      platform: string
      desktop: boolean
      packaged: boolean
      environment: string
      releaseChannel: 'preview' | 'stable' | 'beta'
      updateStatus:
        | 'idle'
        | 'checking'
        | 'available'
        | 'downloading'
        | 'downloaded'
        | 'not-available'
        | 'unavailable'
        | 'error'
      updateMessage: string
    }>
  }
}
