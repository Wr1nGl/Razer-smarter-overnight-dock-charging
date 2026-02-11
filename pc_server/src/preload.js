const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveSettings: (data) => ipcRenderer.send('save-settings', data),
    calculateCharge: () => ipcRenderer.send('calculate_charge'),
    onLoadSettings: (callback) => ipcRenderer.on('load-settings', (_event, value) => callback(value)),
    onTimerUpdate: (callback) => ipcRenderer.on('timer-update', (_event, value) => callback(value))
});