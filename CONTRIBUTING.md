# Contributing

Contributions welcome. Here's how to get started.

## Dev setup

```bash
git clone https://github.com/lukeslp/alt-text-local-ai
cd alt-text-local-ai
pnpm install
cp .env.example .env.local   # add VITE_HF_TOKEN if using Hugging Face models
pnpm start
```

Requires [Ollama](https://ollama.com) running locally with at least one vision model pulled (`ollama pull llava-phi3`).

## Making changes

- **Renderer** (Vue components, store, composables): `src/` — hot reloads automatically via Vite
- **Main process** (Electron, Ollama integration): `src/main/main.js`, `scripts/installer.js` — restart Electron after changes
- **Preload bridge**: `src/preload/preload.js` — controls what `window.electron.*` exposes to the renderer

## Pull requests

1. Fork and create a branch
2. Make your changes
3. Test manually — run `pnpm start` and verify the feature works end-to-end
4. Submit a PR with a clear description of what changed and why

## Commit style

[Conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, etc.

## Areas that need work

- Edit-in-place for generated alt text (the Edit button in ResultsList is a stub)
- Batch processing multiple images at once
- Better progress feedback during model pulls
- Windows testing (Ollama install on Windows is manual — see README)

## Code of conduct

Be respectful. Accessibility is for everyone.

---

**Luke Steuber** · [lukesteuber.com](https://lukesteuber.com) · [@lukesteuber.com](https://bsky.app/profile/lukesteuber.com)
