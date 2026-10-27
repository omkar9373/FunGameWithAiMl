#!/bin/bash
set -e

echo "=========================================="
echo " Starting Hostinger VPS Deployment Setup "
echo "=========================================="

# 1. Update system packages
echo "==> Updating package repository..."
sudo apt update && sudo apt upgrade -y

# 2. Install essential packages: Python3, pip, venv, git, curl, nginx, mysql
echo "==> Installing Python, Nginx, MySQL, and dependencies..."
sudo apt install -y python3 python3-pip python3-venv git curl nginx mysql-server build-essential

# 3. Install Node.js (v20 LTS)
if ! command -v node &> /dev/null; then
    echo "==> Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
node -v
npm -v

# 4. Configure MySQL Database
echo "==> Setting up MySQL Database..."
sudo systemctl start mysql
sudo systemctl enable mysql

sudo mysql -e "CREATE DATABASE IF NOT EXISTS game_prediction_db;"
# Import schema if present
if [ -f "/var/www/Number-Probability/database/schema.sql" ]; then
    echo "==> Importing schema.sql into game_prediction_db..."
    sudo mysql game_prediction_db < /var/www/Number-Probability/database/schema.sql
fi

# 5. Setup Python Virtual Environment & Install Requirements
echo "==> Setting up Backend Virtual Environment..."
cd /var/www/Number-Probability/backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# Ensure backend .env exists
if [ ! -f ".env" ]; then
    echo "==> Creating default backend .env..."
    cat <<EOT > .env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=game_prediction_db
DATABASE_USER=root
DATABASE_PASSWORD=
MODEL_PATH=./ml/artifacts/model.pkl
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_API_URL=http://187.126.123.14
EOT
fi

# 6. Build Frontend
echo "==> Installing frontend dependencies & building..."
cd /var/www/Number-Probability/frontend
npm install
npm run build

# 7. Configure Systemd Service for Backend
echo "==> Configuring systemd service for backend..."
sudo cp /var/www/Number-Probability/deployment/game_prediction.service /etc/systemd/system/game_prediction.service
sudo systemctl daemon-reload
sudo systemctl enable game_prediction
sudo systemctl restart game_prediction

# 8. Configure Nginx
echo "==> Configuring Nginx..."
sudo cp /var/www/Number-Probability/deployment/nginx.conf /etc/nginx/sites-available/number_probability
sudo ln -sf /etc/nginx/sites-available/number_probability /etc/nginx/sites-enabled/
# Remove default nginx site if exists
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "=========================================="
echo " Deployment Complete! "
echo " Access your website at: http://187.126.123.14 "
echo " Backend Status: sudo systemctl status game_prediction "
echo " Nginx Status: sudo systemctl status nginx "
echo "=========================================="
