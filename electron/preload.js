/* Exposes a tiny, safe Steam bridge to the game (window.steam). No-ops when Steam isn't available. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('steam', {
  available: () => ipcRenderer.invoke('steam:available'),
  activateAchievement: (id) => ipcRenderer.invoke('steam:achievement', String(id)),
  setRichPresence: (text) => ipcRenderer.invoke('steam:presence', String(text).slice(0, 250)),
});
