# GitHub Release Checklist

Use this checklist before publishing a new Windows build of Flight Tracker Pro.

## Repository target

- Confirm the intended GitHub owner and repo slug.
- Current publish target in `package.json`: `rlukenbaugh/flight-tracker-pro`
- If the repo slug changes, update the `build.publish` block before packaging.

## Local verification

- Run `npm install`
- Run `npm run lint`
- Run `npm run build`
- Run `npm run dist:win`
- Confirm these files exist in `release/`:
  - `Flight Tracker Pro-Setup-<version>-x64.exe`
  - `Flight Tracker Pro-Portable-<version>-x64.exe`
  - `latest.yml`

## Credentials and signing

- Set `GH_TOKEN`
- Optional but recommended: set `CSC_LINK`
- Optional but recommended: set `CSC_KEY_PASSWORD`
- Confirm `.env` contains any production API keys you intend to ship with the desktop build

## GitHub release publish

- Push the committed code to the target GitHub repo
- Run `npm run publish:win`
- Verify the new GitHub Release contains:
  - Windows installer
  - Portable executable
  - `latest.yml`
  - installer blockmap

## Smoke test

- Install the new setup `.exe` on a Windows machine
- Launch the packaged app and open the About panel
- Click `Check for updates`
- Confirm external links open in the browser, not inside Electron
- Verify live flight mode, auth, and premium links degrade gracefully if env vars are missing

## Release notes

- Summarize major UI or desktop changes
- Mention any required env vars for live integrations
- Call out whether the build is signed or unsigned
