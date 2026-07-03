#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=================================================="
echo "⚙️ Running Gymix WhatsApp Gateway build script (Baileys)"
echo "=================================================="

# 1. Install npm dependencies
npm install

# 2. Clean stale legacy WhatsApp Web data ONLY (NOT .baileys_auth - that holds the active session!)
echo "🧹 Cleaning stale legacy session data (keeping active Baileys session)..."
rm -rf .wwebjs_auth .wwebjs_cache

echo "=================================================="
echo "✅ Build script completed successfully!"
echo "=================================================="
