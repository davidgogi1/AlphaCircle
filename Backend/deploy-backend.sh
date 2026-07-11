#!/bin/bash
set -e

echo "▶ Building backend..."
npm run build

echo "▶ Restarting pm2 process..."
pm2 restart alphacircle-backend

echo "✅ AlphaCircle backend deployment successful"
