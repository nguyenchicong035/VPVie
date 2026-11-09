// Preload: đánh dấu đang chạy trong ứng dụng máy tính + cầu nối thư mục & cập nhật.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('VPDesktop', {
  isApp: true,
  embeddedBrowser: true,
  readActivation: () => ipcRenderer.invoke('license:read'),
  writeActivation: (record) => ipcRenderer.invoke('license:write', record),
  platform: process.platform,
  defaultFolders: () => ipcRenderer.invoke('folders:default'),
  pickFolder: () => ipcRenderer.invoke('folders:pick'),
  openFolder: (dir) => ipcRenderer.invoke('folders:open', dir),
  saveFile: (dir, name, data, isBase64) => ipcRenderer.invoke('file:save', dir, name, data, !!isBase64),
  onPageZoom: (cb) => ipcRenderer.on('page:zoom', (_event, action) => cb(action)),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (e, data) => cb(data)),
});
