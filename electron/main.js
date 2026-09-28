/* Electron shell for desktop / Steam builds. Run: npm install && npm start */
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

/* Optional Steamworks integration (npm i steamworks.js + steam_appid.txt next to the executable). */
let steam = null;
try {
  const appId = parseInt(process.env.STEAM_APP_ID || '480', 10); // 480 = Spacewar test app
  steam = require('steamworks.js').init(appId);
} catch (e) {
  steam = null; // not running under Steam, or steamworks.js not installed
}
ipcMain.handle('steam:available', () => !!steam);
ipcMain.handle('steam:achievement', (e, id) => {
  if (!steam) return false;
  try { return steam.achievement.activate(id); } catch (err) { return false; }
});
ipcMain.handle('steam:presence', (e, text) => {
  if (!steam) return false;
  try { steam.localplayer.setRichPresence('status', text); return true; } catch (err) { return false; }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#0b0a1a',
    title: 'FEEL THE AGI',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep the idle sim ticking when unfocused
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  // open external links (ai-2027.com) in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.alt && input.key === 'Enter'))) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
