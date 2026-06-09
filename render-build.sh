#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=================================================="
echo "⚙️ Running Gymix WhatsApp Gateway custom build script"
echo "=================================================="

# 1. Install npm dependencies
npm install

# 2. Clean stale WhatsApp Web session and cache data
echo "🧹 Cleaning stale WhatsApp Web session and cache data..."
rm -rf .wwebjs_auth .wwebjs_cache

# 3. Configure persistent cache folder for Puppeteer browser binary
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
echo "👉 Storing Puppeteer browser binary in: $PUPPETEER_CACHE_DIR"

# 4. Explicitly install Chrome binary inside cache
echo "📥 Downloading and installing Google Chrome browser..."
npx puppeteer@24.38.0 browsers install chrome

echo "=================================================="
echo "✅ Build script completed successfully!"
echo "=================================================="
