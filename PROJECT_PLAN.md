# Project Plan

## Recent Changes

- Removed the use of Tailwind CDN and its configuration block in index.html. Instead, we now recommend installing Tailwind as a PostCSS plugin or using the Tailwind CLI for production.
- Updated index.html to use the Vue production build (vue.global.prod.js) instead of the development build.
- Updated index.html to use the minified production version of Floating Vue (floating-vue.iife.min.js) to avoid 404 errors.
- Modified the theme initialization code in index.html to run after DOMContentLoaded to fix the error accessing document.body.
- In js/app.js:
  - Added an `availableModels` property to the data() object to fix the Vue warning about it being undefined during render.
  - Added console logging of endpoints and payloads before making fetch requests in both checkModelAvailability() (GET request) and generateAltText() (POST request).

These changes improve production readiness and add detailed logging to aid in debugging API endpoint interactions.

## Update - Social Badges Branding Integration

Replaced the existing footer in index.html with a Social Badges Branding component. This component displays a row of social badges (GitHub, Ollama, Patreon, Substack, and Luke's website) with responsive design adjustments. 