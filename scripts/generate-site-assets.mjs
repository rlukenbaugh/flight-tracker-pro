import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'public')

const siteUrl = normalizeSiteUrl(
  process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://flights.rlukenbaugh.org',
)

const routes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/results', changefreq: 'daily', priority: '0.9' },
  { path: '/dates', changefreq: 'daily', priority: '0.8' },
  { path: '/map', changefreq: 'weekly', priority: '0.8' },
  { path: '/saved', changefreq: 'weekly', priority: '0.7' },
]

const now = new Date().toISOString()

await mkdir(publicDir, { recursive: true })

await Promise.all([
  writeFile(path.join(publicDir, 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8'),
  writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemap(siteUrl, routes, now), 'utf8'),
  writeFile(
    path.join(publicDir, 'site.webmanifest'),
    JSON.stringify(buildManifest(siteUrl), null, 2) + '\n',
    'utf8',
  ),
])

function normalizeSiteUrl(value) {
  return value.replace(/\/+$/, '')
}

function buildRobotsTxt(host) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Host: ${host}`,
    `Sitemap: ${host}/sitemap.xml`,
    '',
  ].join('\n')
}

function buildSitemap(host, entries, lastmod) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${host}${entry.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

function buildManifest(host) {
  return {
    name: 'Flight Tracker Pro',
    short_name: 'Flight Tracker Pro',
    description:
      'Live flight search, flexible-date pricing, and booking guidance for smarter travel decisions.',
    start_url: `${host}/results`,
    scope: `${host}/`,
    display: 'standalone',
    background_color: '#0b1020',
    theme_color: '#0b1020',
    icons: [
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
