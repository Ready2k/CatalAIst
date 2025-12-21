#!/bin/bash

# HTTPS Setup Script for CatalAIst
# This script helps you set up HTTPS with nginx and Let's Encrypt

set -e

echo "🔒 CatalAIst HTTPS Setup"
echo "========================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure it first:"
    echo "  cp .env.example .env"
    exit 1
fi

# Source .env file
source .env

# Check for required variables
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
    echo "❌ Error: JWT_SECRET not configured in .env"
    echo "Please set a secure JWT_SECRET in your .env file"
    exit 1
fi

# Get domain
read -p "Enter your domain (e.g., example.com): " domain

if [ -z "$domain" ]; then
    echo "❌ Error: Domain is required"
    exit 1
fi

# Get email for Let's Encrypt
read -p "Enter your email for Let's Encrypt notifications: " email

if [ -z "$email" ]; then
    echo "❌ Error: Email is required"
    exit 1
fi

echo ""
echo "📦 Configuring nginx with HTTPS..."
echo ""

# Update .env with domain
if grep -q "^DOMAIN=" .env; then
    sed -i.bak "s/^DOMAIN=.*/DOMAIN=$domain/" .env
else
    echo "DOMAIN=$domain" >> .env
fi

# Update ALLOWED_ORIGINS
if grep -q "^ALLOWED_ORIGINS=" .env; then
    sed -i.bak "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$domain|" .env
else
    echo "ALLOWED_ORIGINS=https://$domain" >> .env
fi

echo "✅ Configuration updated!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Ensure your domain DNS points to this server's IP address"
echo "   Check with: dig $domain"
echo ""
echo "2. Ensure ports 80 and 443 are open in your firewall"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo ""
echo "3. Start the application (without SSL first):"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "4. Obtain SSL certificate:"
echo "   docker-compose -f docker-compose.prod.yml run --rm certbot certonly \\"
echo "     --webroot \\"
echo "     --webroot-path=/var/www/certbot \\"
echo "     --email $email \\"
echo "     --agree-tos \\"
echo "     --no-eff-email \\"
echo "     -d $domain"
echo ""
echo "5. Restart nginx to enable HTTPS:"
echo "   docker-compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "6. Verify HTTPS is working:"
echo "   curl https://$domain/health"
echo ""
echo "Certificates will auto-renew every 12 hours via the certbot container."
echo ""
echo "🔒 HTTPS setup complete!"
echo ""
echo "⚠️  Important Security Notes:"
echo "- Keep your .env file secure and never commit it to git"
echo "- Use strong, unique values for JWT_SECRET and encryption keys"
echo "- Monitor your SSL certificate expiration dates"
echo "- Keep your Docker images updated"
echo ""
