import { app, BrowserWindow, Menu, protocol, net } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { initDb } from './db'
import { registerIpcHandlers, getHiddenContentEnabled, setHiddenContentEnabled, setMenuRebuildCallback } from './ipc'
import { pathToFileURL } from 'url'

function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const hiddenEnabled = getHiddenContentEnabled()

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Library...',
          accelerator: 'CmdOrCtrl+L',
          click: (): void => {
            const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
            if (win) win.webContents.send('navigate-add-library')
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Preferences',
      submenu: [
        {
          label: 'Settings...',
          click: (): void => {
            const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
            if (win) {
              win.webContents.send('navigate-settings')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Enable Hidden Content',
          type: 'checkbox',
          checked: hiddenEnabled,
          click: (menuItem): void => {
            setHiddenContentEnabled(menuItem.checked)
            const windows = BrowserWindow.getAllWindows()
            for (const w of windows) {
              w.webContents.send('hidden-content-toggled', menuItem.checked)
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  if (is.dev) {
    const viewMenu = template.find((t) => t.label === 'View')
    if (viewMenu && Array.isArray(viewMenu.submenu)) {
      viewMenu.submenu.push({ type: 'separator' }, { role: 'toggleDevTools' })
    }
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Mindex',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
])

app.whenReady().then(() => {
  protocol.handle('local-file', (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.pathname)
    // On Windows, pathname starts with /C:/... — strip the leading slash
    const normalizedPath = process.platform === 'win32' ? filePath.replace(/^\//, '') : filePath
    return net.fetch(pathToFileURL(normalizedPath).toString())
  })

  initDb()
  registerIpcHandlers()
  buildMenu()
  setMenuRebuildCallback(buildMenu)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
