#!/bin/bash
set -e

echo "▶ Building backend..."
npm run build

echo "▶ Restarting pm2 process..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 restart alphacircle-backend

echo "✅ AlphaCircle backend deployment successful"
