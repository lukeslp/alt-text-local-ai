const { exec, spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

class Installer {
  constructor() {
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.isMac = this.platform === 'darwin';
    this.isLinux = this.platform === 'linux';
  }

  async installOllama() {
    console.log('Installing Ollama...');
    
    try {
      if (this.isMac || this.isLinux) {
        // Get the install script from ollama.ai
        const script = await this.getOllamaInstallScript();
        const tempScript = path.join(os.tmpdir(), 'ollama-install.sh');
        
        // Write the script to a temporary file
        fs.writeFileSync(tempScript, script);
        fs.chmodSync(tempScript, '755');
        
        // Execute the install script
        await execAsync(`sh ${tempScript}`);
        
        // Clean up
        fs.unlinkSync(tempScript);
      } else if (this.isWindows) {
        // For Windows, download and run the MSI installer
        const installerUrl = 'https://ollama.ai/download/ollama-installer.msi';
        const installerPath = path.join(os.tmpdir(), 'ollama-installer.msi');
        
        // Download the installer
        await this.downloadFile(installerUrl, installerPath);
        
        // Run the installer
        await execAsync(`msiexec /i "${installerPath}" /quiet`);
        
        // Clean up
        fs.unlinkSync(installerPath);
      }
      
      console.log('Ollama installed successfully');
      return true;
    } catch (error) {
      console.error('Failed to install Ollama:', error);
      throw error;
    }
  }

  async getOllamaInstallScript() {
    return new Promise((resolve, reject) => {
      https.get('https://ollama.ai/install.sh', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  async downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    });
  }

  async pullModel(modelName, progressCallback) {
    console.log(`Pulling model: ${modelName}`);
    
    return new Promise((resolve, reject) => {
      const ollamaCmd = this.isWindows ? 'ollama.exe' : 'ollama';
      const pull = spawn(ollamaCmd, ['pull', modelName]);
      
      pull.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        
        // Parse progress from Ollama output
        if (output.includes('downloading')) {
          const match = output.match(/(\d+)%/);
          if (match && progressCallback) {
            progressCallback(parseInt(match[1]));
          }
        }
      });
      
      pull.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
      });
      
      pull.on('close', (code) => {
        if (code === 0) {
          console.log(`Successfully pulled ${modelName}`);
          resolve();
        } else {
          reject(new Error(`Failed to pull ${modelName}`));
        }
      });
    });
  }

  async startOllamaServer() {
    console.log('Starting Ollama server...');
    
    const ollamaCmd = this.isWindows ? 'ollama.exe' : 'ollama';
    const server = spawn(ollamaCmd, ['serve']);
    
    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    return server;
  }

  async checkOllamaInstallation() {
    try {
      const ollamaCmd = this.isWindows ? 'ollama.exe' : 'ollama';
      await execAsync(`${ollamaCmd} --version`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = Installer; 