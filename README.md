# Alt Text Generator

A modern web application for generating high-quality alt text descriptions for images using AI vision models. Built with Vue.js and Tailwind CSS, it provides an accessible interface for AI-assisted image descriptions using local Ollama models.

## Quick Start for macOS Users

1. Download and install Ollama from [ollama.ai](https://ollama.ai)
2. Open Terminal (you can find it in Applications > Utilities)
3. Copy and paste this command to download the AI model:
   ```bash
   ollama pull llava-phi3
   ```
4. Start Ollama:
   ```bash
   ollama serve
   ```
5. Visit [actuallyusefulai.com](https://actuallyusefulai.com) to use the web version, or download the desktop app from [Releases](https://github.com/lukeslp/alt-text-generator/releases)

## Features

### Current Features
- Support for local model processing via Ollama:
  - LLaVA-Phi3 (default) - [ollama.ai/library/llava-phi3](https://ollama.ai/library/llava-phi3)
  - Other compatible multimodal models - [ollama.ai/library](https://ollama.ai/library/)
- Accessibility features:
  - Screen reader support with ARIA labels
  - High contrast mode
  - Dark/light theme with system preference detection
  - Customizable font size
  - OpenDyslexic and Atkinson Hyperlegible font support
  - Keyboard navigation
- Drag-and-drop image upload interface
- Real-time processing status updates
- Copy-to-clipboard functionality
- Image preprocessing:
  - Automatic resizing
  - Format optimization
- Detailed analysis mode:
  - Whole image analysis
  - Quadrant analysis (section-by-section)
- Local processing - no data sent to external servers
- Persistent settings storage

### Planned Features (Backlog)
- Text-to-speech output for generated descriptions
- Image metadata features:
  - Automatic metadata injection for downloaded images
  - EXIF data preservation
  - Batch metadata processing
- Enhanced sharing capabilities:
  - Share sheet integration
  - Direct social media platform integration
  - Quick copy formats for different platforms
- Image handling improvements:
  - Paste support for clipboard images
  - URL-based image processing
  - Batch processing capabilities
- Advanced analysis features:
  - Cultural context interpretation
  - Brand and logo detection
  - Facial expression analysis
  - Color palette extraction
  - Object relationship mapping
- Alternative model support:
  - Custom model configuration
  - Model comparison view
  - Fine-tuning options
- Export and integration:
  - JSON/CSV export
  - CMS platform integrations
  - API access for programmatic use
- Collaboration tools:
  - Multi-user editing
  - Review workflows
  - Comment system
- Platform expansion:
  - Browser extension
  - Mobile apps (iOS/Android)
  - CMS plugins
- History and organization:
  - Processing history
  - Favorites system
  - Tags and categories
  - Search functionality
- Accessibility enhancements:
  - Multiple language support
  - Custom prompt templates
  - Contextual help system
  - Keyboard shortcut customization

## Prerequisites

### System Requirements
- Modern web browser (Chrome, Firefox, Safari)
- For local processing:
  - Ollama installed and running
  - 4GB RAM minimum
  - GPU recommended for better performance

### Required Software
1. **Ollama** (for local processing)
   - Download from [ollama.ai](https://ollama.ai)
   - Install and run:
     ```bash
     curl -fsSL https://ollama.ai/install.sh | sh
     ollama serve
     ```

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/lukeslp/alt-text-generator.git
   cd alt-text-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Pull the default model (for local processing):
   ```bash
   ollama pull llava-phi3
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

1. Build the web version:
   ```bash
   npm run build
   ```

2. Preview the production build:
   ```bash
   npm run preview
   ```

## Using Different Models

The app supports various multimodal models through Ollama. Here's how to use them:

1. **LLaVA-Phi3** (Default)
   ```bash
   ollama pull llava-phi3
   ```
   - Best balance of speed and quality
   - Optimized for accessibility descriptions
   - ~4GB download size

2. **LLaVA v1.5**
   ```bash
   ollama pull llava
   ```
   - Original LLaVA model
   - Good general purpose vision model
   - ~4GB download size

[Browse all available vision models on Ollama](https://ollama.ai/library?q=vision)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support Development

This project is part of the Actually Useful AI initiative. If you find it valuable, please consider:

- Supporting development at [assisted.space/join](https://assisted.space/join)
- Visiting [actuallyusefulai.com](https://actuallyusefulai.com) for more AI tools
- Sharing feedback and feature requests through GitHub issues
- Contributing code or documentation improvements

## License

ISC License - See LICENSE file for details.
