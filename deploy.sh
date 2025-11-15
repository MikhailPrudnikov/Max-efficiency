#!/bin/bash

# MaxFlow Zen Deployment Script
# This script deploys both the backend server and the bot

set -e  # Exit on error

echo "🚀 Starting MaxFlow Zen deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project directory
PROJECT_DIR="/usr/local/src/lovable_max/new_version/maxflow-zen-49451"

echo -e "${YELLOW}📂 Project directory: ${PROJECT_DIR}${NC}"

# Navigate to project directory
cd "$PROJECT_DIR"

# 2. Install root dependencies
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install

# 3. Build and deploy server
echo -e "${YELLOW}🔧 Building server...${NC}"
cd server
npm install
npm run migrate
npm run build
cd ..

# 4. Build and deploy bot
echo -e "${YELLOW}🤖 Building bot...${NC}"
cd bot
npm install
npm run build
cd ..

# 5. Build frontend
echo -e "${YELLOW}🎨 Building frontend...${NC}"
npm run build

# 6. Deploy frontend to web directory
echo -e "${YELLOW}📋 Deploying frontend...${NC}"
sudo rm -rf /var/www/max-efficiency.ru/*
sudo cp -r dist/* /var/www/max-efficiency.ru/
sudo chown -R www-data:www-data /var/www/max-efficiency.ru

# 7. Restart/Start PM2 processes
echo -e "${YELLOW}🔄 Managing services...${NC}"

# Check if bot process exists, if not start it
if pm2 list | grep -q "maxflow-bot"; then
    echo -e "${YELLOW}Restarting bot...${NC}"
    pm2 restart maxflow-bot
else
    echo -e "${YELLOW}Starting bot for the first time...${NC}"
    pm2 start ecosystem.config.cjs --only maxflow-bot
fi

# Restart backend
echo -e "${YELLOW}Restarting backend...${NC}"
pm2 restart maxflow-backend

# Save PM2 configuration
pm2 save

# 8. Check status
echo -e "${YELLOW}📊 Checking service status...${NC}"
pm2 status

# 9. Show recent logs
echo -e "${YELLOW}📝 Recent backend logs:${NC}"
pm2 logs maxflow-backend --lines 20 

echo -e "${YELLOW}📝 Recent bot logs:${NC}"
pm2 logs maxflow-bot --lines 20 

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend: https://max-efficiency.ru${NC}"
echo -e "${GREEN}🔧 Backend: Running on port 3001${NC}"
echo -e "${GREEN}🤖 Bot: Running${NC}"