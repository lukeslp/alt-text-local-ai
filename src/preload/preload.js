const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  installOllama: () => ipcRenderer.invoke('install-ollama'),
  pullModel: (modelName, progressCallback) => {
    const listener = (event, progress) => progressCallback(progress);
    ipcRenderer.on('model-pull-progress', listener);
    return ipcRenderer.invoke('pull-model', modelName).finally(() => {
      ipcRenderer.removeListener('model-pull-progress', listener);
    });
  },
  startOllamaServer: () => ipcRenderer.invoke('start-ollama-server'),
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  getOllamaVersion: () => ipcRenderer.invoke('get-ollama-version'),
  getOllamaPath: () => ipcRenderer.invoke('get-ollama-path'),
  stopOllamaServer: () => ipcRenderer.invoke('stop-ollama-server'),
  quit: () => ipcRenderer.invoke('quit-app'),
  openTerminal: () => ipcRenderer.invoke('open-terminal')
}) 