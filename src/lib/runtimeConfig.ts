const DEFAULT_HOSTED_API_BASE_URL = 'https://flights.rlukenbaugh.org'
const DEFAULT_SITE_URL = 'https://flights.rlukenbaugh.org'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function isPackagedDesktop() {
  return typeof window !== 'undefined' && window.location.protocol === 'file:'
}

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ||
  (isPackagedDesktop() ? DEFAULT_HOSTED_API_BASE_URL : '')

export const siteUrl =
  import.meta.env.VITE_SITE_URL?.replace(/\/+$/, '') ||
  (typeof window !== 'undefined' && window.location.protocol !== 'file:'
    ? trimTrailingSlash(window.location.origin)
    : DEFAULT_SITE_URL)

const livePricingFlag = import.meta.env.VITE_ENABLE_LIVE_FLIGHTS?.trim().toLowerCase()

export const livePricingAvailable =
  livePricingFlag === 'true' || (livePricingFlag !== 'false' && Boolean(apiBaseUrl))

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
