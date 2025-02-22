#!/bin/bash

# Create archive directory structure
mkdir -p archive/legacy-web/.github

# Move GitHub funding configuration
mv .github/FUNDING.yml archive/legacy-web/.github/

# Move web-specific configuration files (if they exist)
for file in webpack.config.js gulpfile.js vite.config.js; do
    if [ -f "$file" ]; then
        mv "$file" archive/legacy-web/
    fi
done

# Move web-specific folders
for dir in public src/web views; do
    if [ -d "$dir" ]; then
        mkdir -p "archive/legacy-web/$(dirname "$dir")"
        mv "$dir" "archive/legacy-web/$(dirname "$dir")/"
    fi
done

echo "Non-Electron files have been archived to archive/legacy-web/" 