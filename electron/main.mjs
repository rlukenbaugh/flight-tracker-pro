import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const updaterState = {
  status: 'idle',
  message: 'Automatic update checks are available in packaged builds.',
}
let cachedAutoUpdater = null

function getReleaseChannel() {
  const configured = (process.env.FLIGHT_TRACKER_RELEASE_CHANNEL || '').toLowerCase()

  if (configured === 'preview' || configured === 'beta' || configured === 'stable') {
    return configured
  }

  const version = app.getVersion().toLowerCase()
  if (version.includes('beta')) {
    return 'beta'
  }

  if (version.includes('preview') || version.includes('alpha') || version.includes('rc')) {
    return 'preview'
  }

  return 'stable'
}

function setUpdaterState(status, message) {
  updaterState.status = status
  updaterState.message = message
}

async function loadAutoUpdater() {
  if (cachedAutoUpdater) {
    return cachedAutoUpdater
  }

  try {
    const { autoUpdater } = await import('electron-updater')
    cachedAutoUpdater = autoUpdater
    return autoUpdater
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown updater import error.'
    setUpdaterState('error', `Updater module unavailable: ${message}`)
    console.error('Unable to load electron-updater:', error)
    return null
  }
}

function getDesktopAppInfo() {
  return {
    version: app.getVersion(),
    platform: process.platform,
    desktop: true,
    packaged: app.isPackaged,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'desktop',
    releaseChannel: getReleaseChannel(),
    updateStatus: updaterState.status,
    updateMessage: updaterState.message,
  }
}

async function runUpdateCheck() {
  if (!app.isPackaged) {
    setUpdaterState('unavailable', 'Install a packaged build to test GitHub release updates.')
    return getDesktopAppInfo()
  }

  const autoUpdater = await loadAutoUpdater()
  if (!autoUpdater) {
    return getDesktopAppInfo()
  }

  setUpdaterState('checking', 'Checking GitHub Releases for a newer desktop build.')

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown update error.'
    setUpdaterState('error', `Update check failed: ${message}`)
  }

  return getDesktopAppInfo()
}

async function configureAutoUpdates() {
  if (!app.isPackaged) {
    setUpdaterState('unavailable', 'Install a packaged build to test GitHub release updates.')
    return
  }

  const autoUpdater = await loadAutoUpdater()
  if (!autoUpdater) {
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    setUpdaterState('available', `Version ${info.version} is available and downloading now.`)
    console.log('Update available:', info.version)
  })

  autoUpdater.on('download-progress', (progress) => {
    setUpdaterState(
      'downloading',
      `Downloading update: ${Math.round(progress.percent)}% complete.`,
    )
  })

  autoUpdater.on('update-downloaded', async (info) => {
    setUpdaterState('downloaded', `Version ${info.version} is ready to install on restart.`)
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `Flight Tracker Pro ${info.version} is ready to install.`,
      detail: 'Restart the app now to apply the update.',
    })

    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('update-not-available', () => {
    setUpdaterState('not-available', 'You are already on the latest published desktop build.')
  })

  autoUpdater.on('error', (error) => {
    setUpdaterState('error', `Updater error: ${error.message}`)
    console.error('Auto-update error:', error)
  })

  setUpdaterState('checking', 'Checking GitHub Releases for a newer desktop build.')

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    setUpdaterState('error', `Initial update check failed: ${error.message}`)
    console.error('Update check failed:', error)
  })
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#07111f',
    autoHideMenuBar: true,
    title: 'Flight Tracker Pro',
    icon: path.join(__dirname, '..', 'build', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.rlukenbaugh.flighttrackerpro')
  ipcMain.handle('desktop:get-app-info', () => getDesktopAppInfo())
  ipcMain.handle('desktop:check-for-updates', () => runUpdateCheck())
  createWindow()
  void configureAutoUpdates()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
