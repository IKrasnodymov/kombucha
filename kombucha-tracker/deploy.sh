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
    server_name 165.232.124.244;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name 165.232.124.244;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://ikrasnodymov.github.io' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://ikrasnodymov.github.io' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOL

# Create symbolic link if it doesn't exist
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
