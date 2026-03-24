# Alt Text AI

![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/built_with-Electron-47848F?logo=electron&logoColor=white)
![Status](https://img.shields.io/badge/status-active-brightgreen)

A desktop app that generates descriptive alt text for images using local vision models. Drop an image in, get a description back. Everything runs on your machine — no images leave your device, no API key required for local models.

---

## Features

- Drag-and-drop or click-to-select images (PNG, JPG, GIF, WebP)
- Generate descriptions using Ollama vision models: `llava`, `llava-phi3`, `bakllava`
- Optionally use Hugging Face hosted models with your own token
- Resize and optimize images before processing (canvas-based, no server round-trip)
- Copy generated alt text with one click
- Edit or refine descriptions inline before copying
- Light and dark mode
- Keyboard-accessible interface with ARIA live region announcements
- Built-in Ollama install and model-pull flow (macOS/Linux; see Windows note below)

---

## Dev Setup

```bash
git clone https://github.com/lukeslp/alt-text-local-ai
cd alt-text-local-ai
pnpm install
```

### Pull Ollama models

Install [Ollama](https://ollama.com), then pull at least one vision model:

```bash
ollama pull llava          # recommended — best quality
ollama pull llava-phi3     # smaller, faster
ollama pull bakllava       # alternative
```

Start Ollama if it isn't already running:

```bash
ollama serve
```

### Hugging Face (optional)

If you want to use HuggingFace hosted models instead of (or in addition to) local Ollama models, create a `.env.local` file:

```bash
cp .env.example .env.local
# edit .env.local and set VITE_HF_TOKEN=hf_...
```

### Start the app

```bash
pnpm start
```

This launches the Vite dev server on port 5173 and opens Electron pointed at it. Hot reloading works in the renderer; changes to `src/main/main.js` require a restart.

### Requirements

- Node.js + pnpm
- [Ollama](https://ollama.com) installed and running (or a Hugging Face token for hosted models)
- macOS 10.15+ or Windows 10+
- 8 GB RAM recommended for local models

---

## Windows Note

Automated Ollama install is not supported on Windows yet. When you click "Install Ollama" in the app, it opens the [Ollama download page](https://ollama.com/download/windows) in your browser. Install it manually, then restart the app and it will detect the running server.

---

## Building

```bash
pnpm build                     # Vite production build only
pnpm run electron:build:mac    # macOS DMG (x64 + arm64)
pnpm run electron:build:win    # Windows NSIS installer
pnpm run electron:build:linux  # AppImage + deb
```

Built packages land in `dist_electron/`.

---

## Installing a Release

### macOS
1. Download the `.dmg` from the releases page
2. Open the DMG and drag Alt Text AI to Applications
3. Right-click and choose Open on first launch (Gatekeeper prompt)

### Windows
1. Download the Windows installer from the releases page
2. Run it and follow the prompts

---

## Architecture

Three-process Electron model:

| Layer | File | Responsibility |
|-------|------|---------------|
| Main process | `src/main/main.js` | BrowserWindow, IPC handlers, Ollama lifecycle via `scripts/installer.js` |
| Preload bridge | `src/preload/preload.js` | Exposes `window.electron` to the renderer via `contextBridge` |
| Renderer | `src/App.vue` + `src/components/` | Vue 3 + Pinia SPA, communicates with main only through the preload API |

State is managed in a single Pinia store (`src/store/index.js`) holding the results list, selected model, feed messages, and theme settings.

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|---------|
| `VITE_HF_TOKEN` | Hugging Face API token for hosted models | No |

Set in `.env.local` (gitignored). See `.env.example` for the template.

---

## Privacy

All local model inference runs through Ollama on `localhost:11434`. No image data is sent anywhere. If you use a Hugging Face model, your images go to the HF Inference API — that's the only case where data leaves the device.

---

## Links

- [View on GitHub](https://github.com/lukeslp/alt-text-local-ai)
- [Model on Ollama](https://ollama.com/coolhand/impossible_alt)
- [Report an issue](https://github.com/lukeslp/alt-text-generator/issues)

---

## Author

**Luke Steuber**
[lukesteuber.com](https://lukesteuber.com) — [@lukesteuber.com](https://bsky.app/profile/lukesteuber.com) on Bluesky

## License

MIT — see [LICENSE](LICENSE) for details.
