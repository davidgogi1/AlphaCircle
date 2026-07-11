#!/bin/bash
set -e

APP_ROOT="/var/www"
CURRENT="alphacircle"
NEW="alphacircle_new"
OLD="alphacircle_old"

echo "▶ Selecting Node version..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22

echo "▶ Building frontend..."
npm run build

echo "▶ Preparing new build directory..."
sudo rm -rf "$APP_ROOT/$NEW"
sudo mkdir -p "$APP_ROOT/$NEW"

echo "▶ Copying build files..."
sudo cp -r dist/* "$APP_ROOT/$NEW/"

echo "▶ Swapping directories..."
sudo rm -rf "$APP_ROOT/$OLD"
sudo mv "$APP_ROOT/$CURRENT" "$APP_ROOT/$OLD" 2>/dev/null || true
sudo mv "$APP_ROOT/$NEW" "$APP_ROOT/$CURRENT"

echo "▶ Reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "✅ AlphaCircle frontend deployment successful"
