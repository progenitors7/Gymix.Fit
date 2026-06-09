#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=================================================="
echo "⚙️ Running Gymix WhatsApp Gateway build script (Baileys)"
echo "=================================================="

# 1. Install npm dependencies
npm install

# 2. Clean stale WhatsApp Web session and cache data
echo "🧹 Cleaning stale session data..."
rm -rf .wwebjs_auth .wwebjs_cache .baileys_auth

echo "=================================================="
echo "✅ Build script completed successfully!"
echo "=================================================="
