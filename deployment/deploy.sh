#!/bin/bash
set -e

echo "=========================================="
echo " 🚀 Starting Auto-Deployment on VPS... "
echo "=========================================="

cd /var/www/Number-Probability

# Reset any unstaged local changes and pull latest main
echo "==> Pulling latest changes from GitHub main branch..."
git fetch origin main
git reset --hard origin/main

# Update backend dependencies if needed
if [ -f "backend/requirements.txt" ] && [ -d "backend/venv" ]; then
    echo "==> Verifying Python dependencies..."
    ./backend/venv/bin/pip install -r backend/requirements.txt --quiet || true
fi

# Set proper web permissions
echo "==> Setting folder permissions..."
chmod -R 755 /var/www/Number-Probability

# Restart backend systemd service
echo "==> Restarting backend service (game_prediction)..."
systemctl daemon-reload
systemctl restart game_prediction

# Reload Nginx web server
echo "==> Reloading Nginx..."
nginx -t
systemctl reload nginx

echo "=========================================="
echo " ✅ Auto-Deployment Complete & Live! "
echo "=========================================="
