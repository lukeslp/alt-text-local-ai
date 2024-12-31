const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  installOllama: () => ipcRenderer.invoke('install-ollama'),
  pullModel: (modelName, progressCallback) => {
    ipcRenderer.on('model-pull-progress', (event, progress) => {
      progressCallback(progress)
    })
    return ipcRenderer.invoke('pull-model', modelName)
  },
  startOllamaServer: () => ipcRenderer.invoke('start-ollama-server'),
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  getOllamaVersion: () => ipcRenderer.invoke('get-ollama-version'),
  getOllamaPath: () => ipcRenderer.invoke('get-ollama-path'),
  stopOllamaServer: () => ipcRenderer.invoke('stop-ollama-server'),
  quit: () => ipcRenderer.invoke('quit-app')
}) 