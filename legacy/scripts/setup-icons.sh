# DEPRECATED – archived by Codex 2025-06-07. Safe to delete after 90 days.
#!/bin/bash

# Create necessary directories
mkdir -p assets
mkdir -p build/icons

# Create a more visually distinct triangle icon using ImageMagick
convert -size 1024x1024 \
  \( -size 1024x1024 gradient:'#2D9CDB-#2F80ED' -rotate 45 \) \
  \( -size 1024x1024 xc:transparent \
     -draw "fill white polygon 512,50 50,950 974,950" \
     -alpha set -channel A -evaluate multiply 1.0 \) \
  -compose over -composite \
  -draw "fill none stroke white stroke-width 40 polygon 512,50 50,950 974,950" \
  \( +clone -background black -shadow 80x20+0+10 \) \
  +swap -background none -layers merge +repage \
  assets/triangle_construct_light.png

# Run the icon generation script
./scripts/create-icons.sh

echo "Icon setup complete!" 