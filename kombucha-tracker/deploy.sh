#!/bin/bash

# Update system and install Node.js
apt update
apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Create project directory
mkdir -p /root/kombucha
cd /root/kombucha

# Clone the repository (if not exists)
if [ ! -d "/root/kombucha/.git" ]; then
    git clone https://github.com/IKrasnodymov/kombucha.git .
else
    git pull origin main
fi

# Install dependencies
cd kombucha-tracker
npm install

# Setup systemd service
cp kombucha.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable kombucha
systemctl restart kombucha

# Show status
systemctl status kombucha
