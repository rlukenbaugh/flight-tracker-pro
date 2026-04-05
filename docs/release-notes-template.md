# Flight Tracker Pro {{VERSION}}

## Highlights

- Premium Windows desktop build with installer-based auto-updates from GitHub Releases
- Flight intelligence dashboard with scoring, flexible-date heatmap, route map explorer, and saved watchlists
- Live-ready integration path for Amadeus flights, Open-Meteo weather, Supabase auth, and Stripe upgrade links
- In-app About panel with update checks, release notes access, and download path to the latest build

## Desktop Experience

- Branded Windows installer and portable executable
- Electron auto-update support using `latest.yml` and release metadata
- Safe external-link handling so payment, docs, and release links open in the browser

## What To Configure Next

- Add `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` to enable live flight offers
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable magic-link auth
- Add `VITE_STRIPE_PAYMENT_LINK_ELITE` and `VITE_STRIPE_PAYMENT_LINK_CONCIERGE` to activate premium checkout buttons

## Release Assets

- Windows installer
- Portable executable
- Auto-update metadata for packaged clients

## Notes

- This `v{{VERSION}}` release was published from `{{REPO_URL}}`
- The current `v{{VERSION}}` binaries are unsigned; signed GitHub Actions releases are configured for future versions once `CSC_LINK` and `CSC_KEY_PASSWORD` are added
