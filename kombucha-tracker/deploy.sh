#!/bin/bash

# Update system and install Node.js
apt update
apt install -y curl certbot nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Configure Nginx
cat > /etc/nginx/sites-available/kombucha << 'EOL'
server {
    listen 80;
    server_name kombucha.ikrasnodymov.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name kombucha.ikrasnodymov.com;

    ssl_certificate /etc/letsencrypt/live/kombucha.ikrasnodymov.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kombucha.ikrasnodymov.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/kombucha /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Get SSL certificate
certbot --nginx -d kombucha.ikrasnodymov.com --non-interactive --agree-tos -m ikrasnodymov@gmail.com

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
