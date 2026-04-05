# Flight Tracker Pro

Premium flight intelligence for travelers who want better booking decisions, now packaged as a Windows desktop app.

## What ships

- Premium React/Vite dashboard for flight search, comparison, scoring, saved watches, and price intelligence
- Electron desktop wrapper for Windows distribution
- NSIS installer and portable `.exe` packaging
- GitHub Releases publish path for auto-updates
- Supabase-ready auth and alert persistence
- Live-flight adapter path for Amadeus and live weather from Open-Meteo

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
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` enable Supabase auth
- `VITE_STRIPE_PAYMENT_LINK_ELITE` and `VITE_STRIPE_PAYMENT_LINK_CONCIERGE` enable premium checkout buttons
- `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` are required by `api/flight-offers.ts`

### GitHub Releases publishing

- `GH_TOKEN` is required to publish desktop releases to GitHub

The current desktop publish target assumes:

- GitHub owner: `rlukenbaugh`
- GitHub repo: `flight-tracker-pro`

If the final repo name changes, update the `build.publish` block in `package.json`.

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

## Notes

- The current GitHub publish config is an intentional assumption based on your GitHub owner. If you want a different repo slug, update `package.json`.
- The live-flight route is desktop-ready, but still depends on real API credentials.
- Supabase auth and Stripe links are wired with graceful fallback when env vars are missing.
