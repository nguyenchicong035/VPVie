// Preload: đánh dấu đang chạy trong ứng dụng máy tính + cầu nối thư mục lưu sổ/video.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('VPDesktop', {
  isApp: true,
  platform: process.platform,
  defaultFolders: () => ipcRenderer.invoke('folders:default'),
  pickFolder: () => ipcRenderer.invoke('folders:pick'),
  openFolder: (dir) => ipcRenderer.invoke('folders:open', dir),
  saveFile: (dir, name, data, isBase64) => ipcRenderer.invoke('file:save', dir, name, data, !!isBase64),
});
