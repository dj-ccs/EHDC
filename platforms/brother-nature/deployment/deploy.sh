#!/bin/bash
# Brother Nature Deployment Script
# Deploy to carboncaptureshield.com/BrotherNature

set -e

echo "🌱 Deploying Brother Nature Platform..."

# Configuration
DEPLOY_PATH="/var/www/carboncaptureshield.com/BrotherNature"
REPO_URL="https://github.com/dj-ccs/EHDC.git"
BRANCH="main"
NODE_ENV="production"
PM2_APP_NAME="brother-nature"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Updating code...${NC}"
if [[ ! -d "$DEPLOY_PATH" ]]; then
    sudo mkdir -p $DEPLOY_PATH
    sudo chown $USER:$USER $DEPLOY_PATH
    git clone $REPO_URL $DEPLOY_PATH
fi

cd $DEPLOY_PATH
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
cd platforms/brother-nature/core
npm ci --production

echo -e "${YELLOW}Step 3: Running database migrations...${NC}"
npx prisma migrate deploy

echo -e "${YELLOW}Step 4: Building TypeScript...${NC}"
npm run build

echo -e "${YELLOW}Step 5: Setting up PM2...${NC}"
# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop existing process if running
pm2 stop $PM2_APP_NAME || true
pm2 delete $PM2_APP_NAME || true

# Start new process
pm2 start dist/index.js --name $PM2_APP_NAME --env production \
    --log-date-format "YYYY-MM-DD HH:mm:ss Z" \
    --error logs/error.log \
    --output logs/output.log \
    --merge-logs

# Save PM2 configuration
pm2 save
pm2 startup

echo -e "${YELLOW}Step 6: Setting up Nginx...${NC}"
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/brother-nature.conf > /dev/null <<EOF
# Brother Nature Platform Configuration

location /BrotherNature {
    # Remove /BrotherNature from the request when proxying
    rewrite ^/BrotherNature/(.*)$ /\$1 break;
    
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_cache_bypass \$http_upgrade;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Script-Name /BrotherNature;
    
    # WebSocket support for real-time features
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}

# Static assets with caching
location /BrotherNature/static {
    alias $DEPLOY_PATH/platforms/brother-nature/core/public;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/brother-nature.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

echo -e "${YELLOW}Step 7: Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/brother-nature > /dev/null <<EOF
$DEPLOY_PATH/platforms/brother-nature/core/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Brother Nature is now accessible at: https://www.carboncaptureshield.com/BrotherNature${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env file at: $DEPLOY_PATH/platforms/brother-nature/core/.env"
echo "2. Set up SSL if not already configured"
echo "3. Configure your Stellar wallet for token integration"
echo "4. Monitor logs with: pm2 logs $PM2_APP_NAME"
