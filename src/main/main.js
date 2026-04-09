const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const isDev = !app.isPackaged
const { exec } = require('child_process')
const os = require('os')
const Installer = require('../../scripts/installer')

let mainWindow
let ollamaProcess
let installer

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Alt Text AI',
    icon: path.join(__dirname, '../../assets/icons/triangle_construct_light.gif'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html')
    mainWindow.loadFile(indexPath).catch(e => {
      console.error('Failed to load index.html:', e)
      mainWindow.loadURL(`file://${indexPath}`).catch(e => {
        console.error('Failed to load using file URL:', e)
      })
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

ipcMain.handle('install-ollama', async () => {
  try {
    installer = installer || new Installer();
    const isInstalled = await installer.checkOllamaInstallation();

    if (!isInstalled) {
      if (process.platform === 'win32') {
        await shell.openExternal('https://ollama.com/download/windows');
        return { needsManualInstall: true };
      }
      await installer.installOllama();
    }

    return true;
  } catch (error) {
    console.error('Failed to install Ollama:', error);
    throw error;
  }
});

ipcMain.handle('pull-model', async (event, modelName) => {
  try {
    installer = installer || new Installer();
    await installer.pullModel(modelName, (progress) => {
      event.sender.send('model-pull-progress', progress);
    });
    return true;
  } catch (error) {
    console.error('Failed to pull model:', error);
    throw error;
  }
});

ipcMain.handle('start-ollama-server', async () => {
  try {
    installer = installer || new Installer();
    ollamaProcess = await installer.startOllamaServer();
    return true;
  } catch (error) {
    console.error('Failed to start Ollama server:', error);
    throw error;
  }
});

ipcMain.handle('check-ollama-status', async () => {
  try {
    installer = installer || new Installer();
    return await installer.checkOllamaInstallation();
  } catch (error) {
    return false;
  }
});

ipcMain.handle('quit-app', () => {
  app.quit()
})

app.whenReady().then(() => {
  createWindow()

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

app.on('before-quit', () => {
  if (ollamaProcess) {
    ollamaProcess.kill()
  }
})

const getOllamaVersion = () => {
  return new Promise((resolve, reject) => {
    exec('ollama --version', (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout.trim())
    })
  })
}

const getOllamaPath = () => {
  return new Promise((resolve, reject) => {
    const platform = os.platform()
    const command = platform === 'win32' ? 'where ollama' : 'which ollama'
    
    exec(command, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout.trim())
    })
  })
}

const stopOllamaServer = () => {
  return new Promise((resolve, reject) => {
    if (!ollamaProcess) {
      resolve()
      return
    }

    ollamaProcess.on('close', () => {
      ollamaProcess = null
      resolve()
    })

    ollamaProcess.kill()
  })
}

ipcMain.handle('get-ollama-version', async () => {
  try {
    const version = await getOllamaVersion()
    return version
  } catch (error) {
    throw error
  }
})

ipcMain.handle('get-ollama-path', async () => {
  try {
    const path = await getOllamaPath()
    return path
  } catch (error) {
    throw error
  }
})

ipcMain.handle('stop-ollama-server', async () => {
  try {
    await stopOllamaServer()
    return true
  } catch (error) {
    throw error
  }
})

const openTerminal = async () => {
  return new Promise((resolve, reject) => {
    const platform = os.platform()
    let command

    switch (platform) {
      case 'darwin':
        command = 'open -a Terminal'
        break
      case 'win32':
        command = 'start cmd'
        break
      case 'linux': {
        // Try common terminal emulators
        const terminals = ['gnome-terminal', 'konsole', 'xterm']
        command = terminals[0] // Default to gnome-terminal, fallback to xterm
        for (const term of terminals) {
          try {
            require('child_process').execSync(`which ${term}`, { stdio: 'ignore' })
            command = term
            break
          } catch (_err) {
            // Continue trying
          }
        }
        break
      }
      default:
        reject(new Error('Unsupported platform'))
        return
    }

    exec(command, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

ipcMain.handle('open-terminal', async () => {
  try {
    await openTerminal()
    return true
  } catch (error) {
    console.error('Failed to open terminal:', error)
    throw error
  }
})
