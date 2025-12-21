# HTTPS Setup Guide

Complete guide for setting up HTTPS with nginx and Let's Encrypt SSL certificates for CatalAIst.

## Quick Start

```bash
# Run the setup script
./setup-https.sh
```

The script will guide you through configuring your domain and obtaining SSL certificates.

---

## nginx with Let's Encrypt

CatalAIst uses nginx as a reverse proxy with Let's Encrypt for SSL certificates.

### Prerequisites

1. **Domain name** pointing to your server's IP address
2. **Ports 80 and 443** open in your firewall
3. **Valid email** for Let's Encrypt notifications

### Setup Steps

1. **Configure your domain**:
   ```bash
   # Edit .env file
   DOMAIN=your-domain.com
   ALLOWED_ORIGINS=https://your-domain.com
   ```

2. **Start nginx and backend**:
   ```bash
   docker-compose -f docker-compose.nginx.yml up -d
   ```

3. **Obtain SSL certificate**:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email your-email@example.com \
     --agree-tos \
     --no-eff-email \
     -d your-domain.com
   ```

4. **Restart nginx**:
   ```bash
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

5. **Verify HTTPS**:
   ```bash
   curl https://your-domain.com/health
   ```

### Certificate Renewal

Certificates are automatically renewed by the certbot container every 12 hours.

To manually renew:
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

### nginx Configuration

The `nginx.conf` includes:
- SSL/TLS configuration (TLS 1.2+)
- HTTP to HTTPS redirect
- Security headers
- Reverse proxy to backend and frontend
- Timeouts and connection settings
- Access logging

### Troubleshooting nginx

**Certificate not obtained**:
- Check DNS: `dig your-domain.com`
- Check ports: `netstat -tulpn | grep -E ':(80|443)'`
- Check certbot logs: `docker-compose -f docker-compose.prod.yml logs certbot`

**nginx won't start**:
- Check configuration: `docker-compose -f docker-compose.prod.yml exec nginx nginx -t`
- Check logs: `docker-compose -f docker-compose.prod.yml logs nginx`

---

## Local Development (No HTTPS)

For local development, use the standard docker-compose.yml without HTTPS:

```bash
docker-compose up -d
```

This runs the application without nginx, exposing the backend on port 8080 and frontend on port 80.

---

## Security Best Practices

### 1. Strong Secrets

Generate strong secrets for production:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption keys
openssl rand -base64 32
```

Update `.env`:
```bash
JWT_SECRET=<generated-secret>
PII_ENCRYPTION_KEY=<generated-key>
CREDENTIALS_ENCRYPTION_KEY=<generated-key>
```

### 2. Firewall Configuration

Only expose necessary ports:
```bash
# Allow HTTP (for ACME challenge)
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Block direct access to backend
sudo ufw deny 8080/tcp
```

### 3. CORS Configuration

Restrict CORS to your domain only:
```bash
ALLOWED_ORIGINS=https://your-domain.com
```

For multiple domains:
```bash
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

### 4. Regular Updates

Keep Docker images updated:
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Monitor Certificates

Check certificate expiration:
```bash
docker-compose -f docker-compose.prod.yml exec certbot certbot certificates
```

---

## SSL/TLS Configuration

### Supported Protocols

- TLS 1.2
- TLS 1.3

### Security Headers

nginx includes:
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options` (clickjacking protection)
- `X-Content-Type-Options` (MIME sniffing protection)
- `X-XSS-Protection` (XSS protection)
- `Referrer-Policy` (referrer control)

### Certificate Details

- **Issuer**: Let's Encrypt
- **Validity**: 90 days
- **Auto-renewal**: Yes (via certbot container every 12 hours)
- **Algorithm**: RSA 2048 or ECDSA P-256

---

## Testing HTTPS

### 1. SSL Labs Test

Test your SSL configuration:
```
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

Target grade: **A or A+**

### 2. Security Headers

Check security headers:
```bash
curl -I https://your-domain.com
```

Should include:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`

### 3. Certificate Validation

Check certificate:
```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### 4. HTTP to HTTPS Redirect

Verify redirect:
```bash
curl -I http://your-domain.com
```

Should return `301` or `302` redirect to HTTPS.

---

## Troubleshooting

### Common Issues

**1. "Connection refused" on port 443**
- Check if container is running: `docker ps`
- Check if port is open: `netstat -tulpn | grep 443`
- Check firewall: `sudo ufw status`

**2. "Certificate not trusted"**
- Wait a few minutes for certificate issuance
- Check certbot/caddy logs
- Verify domain DNS is correct

**3. "Too many requests" from Let's Encrypt**
- Let's Encrypt has rate limits (50 certificates per domain per week)
- Wait before retrying
- Use staging environment for testing

**4. "Mixed content" warnings**
- Ensure REACT_APP_API_URL is empty (uses relative URLs)
- Check browser console for HTTP resources on HTTPS page

### Getting Help

1. Check logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   docker-compose -f docker-compose.prod.yml logs certbot
   ```

2. Check container status:
   ```bash
   docker ps -a
   ```

3. Test configuration:
   ```bash
   docker-compose -f docker-compose.prod.yml exec nginx nginx -t
   ```

---

## Production Checklist

Before going live:

- [ ] Domain DNS configured correctly
- [ ] Ports 80 and 443 open in firewall
- [ ] Strong JWT_SECRET and encryption keys set
- [ ] ALLOWED_ORIGINS configured for your domain
- [ ] SSL certificate obtained successfully
- [ ] HTTPS redirect working
- [ ] Security headers present
- [ ] Backend health check passing
- [ ] Frontend loading correctly
- [ ] API requests working over HTTPS
- [ ] SSL Labs test shows A or A+ grade

---

## Additional Resources

- **nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **Certbot Documentation**: https://certbot.eff.org/
- **SSL Labs**: https://www.ssllabs.com/
- **Mozilla SSL Configuration Generator**: https://ssl-config.mozilla.org/

---

**Last Updated**: November 10, 2025 (v2.1.0)
