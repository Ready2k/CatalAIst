# Production Deployment Guide

Quick reference for deploying CatalAIst to production with HTTPS.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Domain name pointing to your server
- Ports 80 and 443 open in firewall

## Quick Deployment

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd CatalAIst

# Copy environment file
cp .env.example .env

# Generate secure secrets
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for PII_ENCRYPTION_KEY
openssl rand -base64 32  # Use for CREDENTIALS_ENCRYPTION_KEY

# Edit .env with your values
nano .env
```

Required `.env` configuration:
```bash
DOMAIN=your-domain.com
JWT_SECRET=<generated-secret>
PII_ENCRYPTION_KEY=<generated-key>
CREDENTIALS_ENCRYPTION_KEY=<generated-key>
ALLOWED_ORIGINS=https://your-domain.com
```

### 2. Run HTTPS Setup

```bash
./setup-https.sh
```

This will:
- Validate your configuration
- Update domain settings
- Provide step-by-step instructions

### 3. Start Application

```bash
# Start without SSL first
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 4. Obtain SSL Certificate

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com
```

### 5. Enable HTTPS

```bash
# Restart nginx to load certificates
docker-compose -f docker-compose.prod.yml restart nginx

# Verify HTTPS
curl https://your-domain.com/health
```

## Firewall Configuration

```bash
# Allow HTTP (for Let's Encrypt)
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Monitoring

### Check Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f certbot
```

### Check Certificate Status

```bash
docker-compose -f docker-compose.prod.yml exec certbot certbot certificates
```

### Health Checks

```bash
# Backend health
curl https://your-domain.com/health

# Check all containers
docker-compose -f docker-compose.prod.yml ps
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Renew Certificates

Certificates auto-renew every 12 hours. To manually renew:

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

### Backup Data

```bash
# Backup data volume
docker run --rm -v catalai-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/catalai-backup-$(date +%Y%m%d).tar.gz /data

# Backup certificates
docker run --rm -v certbot_conf:/certs -v $(pwd):/backup \
  alpine tar czf /backup/certs-backup-$(date +%Y%m%d).tar.gz /certs
```

### Restore Data

```bash
# Restore data volume
docker run --rm -v catalai-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/catalai-backup-YYYYMMDD.tar.gz -C /
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check configuration
docker-compose -f docker-compose.prod.yml config

# Restart service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### SSL Certificate Issues

```bash
# Check certificate status
docker-compose -f docker-compose.prod.yml exec certbot certbot certificates

# Test nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Check DNS
dig your-domain.com

# Check port accessibility
nc -zv your-domain.com 80
nc -zv your-domain.com 443
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=100
```

## Security Checklist

Before going live:

- [ ] Strong JWT_SECRET and encryption keys set
- [ ] ALLOWED_ORIGINS configured for your domain only
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] SSL certificate obtained and working
- [ ] HTTPS redirect enabled
- [ ] Security headers present (check with curl -I)
- [ ] Default admin password changed
- [ ] Regular backups scheduled
- [ ] Monitoring/alerting configured
- [ ] .env file secured (not in git)

## Performance Optimization

### Resource Limits

Add to `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Log Rotation

Configure Docker log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Review documentation: `HTTPS_SETUP_GUIDE.md`
3. Check security status: `SECURITY_STATUS_v2.1.md`

---

**Last Updated**: November 10, 2025 (v2.1.0)
