const DEFAULT_HOSTED_API_BASE_URL = 'https://flight-tracker-pro.vercel.app'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function isPackagedDesktop() {
  return typeof window !== 'undefined' && window.location.protocol === 'file:'
}

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ||
  (isPackagedDesktop() ? DEFAULT_HOSTED_API_BASE_URL : '')

export const livePricingAvailable =
  import.meta.env.VITE_ENABLE_LIVE_FLIGHTS === 'true' ||
  (isPackagedDesktop() && Boolean(apiBaseUrl))

export function buildApiUrl(path: string) {
  if (!apiBaseUrl) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimTrailingSlash(apiBaseUrl)}${normalizedPath}`
}

export const appEnvironmentLabel =
  import.meta.env.VITE_APP_ENVIRONMENT ??
  (import.meta.env.PROD ? 'production' : 'development')
