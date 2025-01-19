#!/bin/bash

# Create necessary directories
mkdir -p assets/icon.iconset
mkdir -p assets/icons
mkdir -p build/icons

# Copy the source icon
cp assets/triangle_construct_light.png assets/icon.iconset/

# Generate different sizes for macOS
echo "Generating macOS icons..."
sips -z 16 16     assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_16x16.png
sips -z 32 32     assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_16x16@2x.png
sips -z 32 32     assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_32x32.png
sips -z 64 64     assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_32x32@2x.png
sips -z 128 128   assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_128x128.png
sips -z 256 256   assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_128x128@2x.png
sips -z 256 256   assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_256x256.png
sips -z 512 512   assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_256x256@2x.png
sips -z 512 512   assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_512x512.png
sips -z 1024 1024 assets/icon.iconset/triangle_construct_light.png --out assets/icon.iconset/icon_512x512@2x.png

# Create icns file
echo "Creating .icns file..."
iconutil -c icns assets/icon.iconset -o build/icons/icon.icns

# Create PNG files for other platforms
echo "Creating PNGs for other platforms..."
sips -z 256 256   assets/icon.iconset/triangle_construct_light.png --out build/icons/icon-256.png
sips -z 512 512   assets/icon.iconset/triangle_construct_light.png --out build/icons/icon-512.png

# Create .ico file for Windows
echo "Creating .ico file for Windows..."
sips -z 256 256 assets/triangle_construct_light.png --out build/icons/icon.png
# Convert PNG to ICO using ImageMagick if available
if command -v convert >/dev/null 2>&1; then
    convert build/icons/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icons/icon.ico
else
    echo "ImageMagick not found - skipping .ico creation"
    cp build/icons/icon.png build/icons/icon.ico
fi

echo "Icon generation complete!" 