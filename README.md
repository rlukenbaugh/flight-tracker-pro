# Flight Tracker Pro

Premium flight intelligence for travelers who want better booking decisions, now packaged as a Windows desktop app.

## What ships

- Premium React/Vite dashboard for flight search, comparison, scoring, saved watches, and price intelligence
- Electron desktop wrapper for Windows distribution
- NSIS installer and portable `.exe` packaging
- GitHub Releases publish path for auto-updates
- Supabase-ready auth and alert persistence
- Live-flight adapter path for Amadeus and live weather from Open-Meteo
- Vercel-hosted API routes with in-memory cache, request validation, rate limiting, and structured telemetry
- Supabase schema for saved flights, saved searches, alert rules, fare snapshots, and usage events

## Local development

```bash
npm install
npm run dev
```

## Desktop build commands

Generate branded icons:

```bash
npm run generate:icons
```

Build the web app:

```bash
npm run build
```

Run the Electron desktop shell locally:

```bash
npm run desktop
```

Create Windows installer and portable executable:

```bash
npm run dist:win
```

Current Windows artifacts are written to:

- `release/Flight-Tracker-Pro-Setup-1.0.0-x64.exe`
- `release/Flight-Tracker-Pro-Portable-1.0.0-x64.exe`

## Environment setup

Copy `.env.example` and fill in what you need.

### App features

- `VITE_ENABLE_LIVE_FLIGHTS=true` enables the live-flight adapter path
- `VITE_API_BASE_URL` points desktop or alternate frontends at a hosted backend
- `VITE_APP_ENVIRONMENT` labels the active frontend environment in the UI
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` enable Supabase auth
- `VITE_STRIPE_PAYMENT_LINK_ELITE` and `VITE_STRIPE_PAYMENT_LINK_CONCIERGE` enable premium checkout buttons
- `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` are required by `api/flight-offers.ts`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` enable hosted API persistence for user state, fare snapshots, and usage telemetry

### GitHub Releases publishing

- `GH_TOKEN` is required to publish desktop releases to GitHub

The current desktop publish target assumes:

- GitHub owner: `rlukenbaugh`
- GitHub repo: `flight-tracker-pro`

If the final repo name changes, update the `build.publish` block in `package.json`.

## Supabase setup

Apply [`supabase/schema.sql`](supabase/schema.sql) to create the small operational database:

- `user_profiles`
- `alert_preferences`
- `saved_flights`
- `saved_searches`
- `fare_snapshots`
- `usage_events`

This keeps account-linked watches, alert rules, and historical fare benchmarks server-side instead of only in local storage.

## Code signing

The app can be built unsigned, but reputation and SmartScreen behavior are much better with signing.

Set these environment variables before packaging a signed build:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

Example:

```powershell
$env:CSC_LINK="file:///C:/certs/flight-tracker-pro.pfx"
$env:CSC_KEY_PASSWORD="your-password"
npm run dist:win
```

## Auto-updates

Electron auto-update support is wired in `electron/main.mjs` using `electron-updater`.

Expected release flow:

1. Push code to the GitHub repo.
2. Set `GH_TOKEN`.
3. Run:

```bash
npm run publish:win
```

That command builds the app, packages the Windows installer, and publishes the release artifacts to GitHub Releases so packaged clients can discover updates.

## GitHub Actions Desktop Releases

The repo now includes a Windows release workflow at `.github/workflows/desktop-release.yml`.

Recommended release flow:

1. Bump the version in `package.json`.
2. Push a matching git tag such as `v1.0.1`, or trigger the workflow manually from GitHub Actions.
3. The workflow will:
   - run `npm ci`
   - lint the app
   - build and publish the signed Windows release
   - upload the portable `.exe`
   - apply polished GitHub release notes

Repository secrets required for signed CI releases:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

`CSC_LINK` can be a secure file URL or base64-encoded `.pfx` payload, which matches the current electron-builder guidance for Windows CI signing.

## Vercel environments

Use Vercel environment separation so preview deployments can point at preview credentials and production deployments can point at production credentials:

- Preview: test or lower-risk provider credentials, preview Supabase project if desired
- Production: production provider credentials, production Supabase, final desktop API base URL

The hosted API layer now emits structured logs for:

- flight search success and failure
- route intelligence success and failure
- airport search success and failure
- client telemetry events
- rate limiting

That gives you immediate runtime monitoring through Vercel logs even before adding a third-party observability vendor.

## Notes

- The current GitHub publish config is an intentional assumption based on your GitHub owner. If you want a different repo slug, update `package.json`.
- The live-flight route is desktop-ready, but still depends on real API credentials.
- Supabase auth and Stripe links are wired with graceful fallback when env vars are missing.
- Desktop release channels can be labeled with `FLIGHT_TRACKER_RELEASE_CHANNEL` as `stable`, `preview`, or `beta`.
