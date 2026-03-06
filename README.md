# Alt Text AI

![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)
![Electron](https://img.shields.io/badge/electron-desktop-blue)

Generates descriptive alt text for images using local vision models. Everything runs on your machine — no images leave your device.

## Dev Setup

```bash
git clone https://github.com/lukeslp/alt-text-local-ai
cd alt-text-local-ai
pnpm install

# Optional: add a Hugging Face token for HF-hosted models
cp .env.example .env.local
# edit .env.local and set VITE_HF_TOKEN=hf_...

pnpm start   # launches Electron + Vite dev server
```

**Windows note:** Automated Ollama install isn't supported yet. When you click "Install Ollama" on Windows, the app opens the [Ollama download page](https://ollama.com/download/windows) in your browser. Install it manually, then restart the app.

## Installation

### macOS
1. Download the latest `Alt Text AI.dmg` from the releases page
2. Open the DMG file
3. Drag Alt Text AI to your Applications folder
4. Right-click the app and select "Open" (required only on first launch)

### Windows
1. Download the latest Windows installer from the releases page
2. Run the installer
3. Follow the installation prompts

## Features
- Generate descriptive alt text for any image
- Runs local vision models via Ollama for privacy and speed
- Supports multiple image formats (PNG, JPG, GIF, WebP)
- Customizable output formats
- Dark/light mode support

## Usage
1. Launch Alt Text AI
2. Drop an image into the app or click to select one
3. The AI will automatically generate alt text
4. Edit or refine the generated text as needed
5. Copy the alt text to use in your projects

## Requirements
- macOS 10.15 or later
- Windows 10 or later
- 8GB RAM recommended
- Internet connection (for initial model download)

## Privacy
All image processing is done locally on your machine. No images are uploaded to external servers.

## Support
For issues or feature requests, please visit:
https://github.com/lukeslp/alt-text-generator/issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Luke Steuber**  
[dr.eamer.dev](https://dr.eamer.dev)
