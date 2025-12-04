#!/usr/bin/env bash
set -euo pipefail

# Alibaba Cloud Linux 3 — minimal bootstrap for LinkLore
# - Installs Node.js 20, nginx, libreoffice
# - Configures firewall and system basics
# - Redis optional (recommend Alibaba Cloud Redis in production)

echo "[1/6] Updating system..."
sudo dnf -y update

echo "[2/6] Installing Node.js 20 LTS..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
sudo dnf -y install nodejs

echo "[3/6] Installing nginx..."
sudo dnf -y install nginx
sudo systemctl enable nginx

echo "[4/6] Installing LibreOffice (headless)..."
sudo dnf -y install libreoffice-headless

echo "[5/6] (Optional) Installing Redis (for development)..."
if [[ "${INSTALL_REDIS:-false}" == "true" ]]; then
  sudo dnf -y install redis
  sudo systemctl enable redis
fi

echo "[6/7] Installing PM2 (process manager)..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi

echo "[7/7] Creating swap (2G) if absent..."
if ! swapon --show | grep -q "swapfile"; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
  sudo swapon /swapfile
fi

echo ""
echo "=========================================="
echo "Bootstrap completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone your project: git clone <repo-url> linklore && cd linklore"
echo "2. Configure environment: cp apps/web/.env.production.example apps/web/.env.production"
echo "3. Edit environment variables: nano apps/web/.env.production"
echo "4. Run deployment script: ./infrastructure/scripts/deploy.sh"
echo "5. Configure Nginx:"
echo "   - Copy: sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf"
echo "   - Edit domain: sudo nano /etc/nginx/nginx.conf"
echo "   - Get SSL cert: sudo certbot --nginx -d your-domain.com"
echo "6. Start services: pm2 start ecosystem.config.js"
echo "7. Set auto-start: pm2 startup && pm2 save"
echo ""











