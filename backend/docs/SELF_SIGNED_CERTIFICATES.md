# Self-Signed Certificate Support

## Overview

When working in corporate environments, you may encounter self-signed certificates or internal Certificate Authorities (CAs) that cause SSL/TLS verification errors when connecting to AWS Bedrock or other services.

Common error messages:
- `self signed certificate in certificate chain`
- `unable to verify the first certificate`
- `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

## Solution

CatalAIst supports disabling TLS certificate validation for development and testing environments.

### Environment Variable Configuration

Set the following environment variable to disable certificate validation:

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Docker Configuration

If running with Docker, add the environment variable to your `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - NODE_TLS_REJECT_UNAUTHORIZED=0
```

Or pass it when running the container:

```bash
docker run -e NODE_TLS_REJECT_UNAUTHORIZED=0 catalai-backend
```

### Local Development

For local development, you can set it in your shell:

**Bash/Zsh:**
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm run dev
```

**Windows PowerShell:**
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run dev
```

**Windows CMD:**
```cmd
set NODE_TLS_REJECT_UNAUTHORIZED=0
npm run dev
```

### .env File

Add to your `.env` file:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Security Considerations

⚠️ **WARNING**: Disabling certificate validation should **ONLY** be used in:
- Development environments
- Testing environments
- Trusted corporate networks with internal CAs

**NEVER** disable certificate validation in production environments as it:
- Exposes you to man-in-the-middle attacks
- Compromises the security of your AWS credentials
- Violates security best practices

## Better Alternatives for Production

Instead of disabling certificate validation, consider these production-ready solutions:

### 1. Install Corporate CA Certificate

Install your organization's root CA certificate in the system trust store:

**Linux:**
```bash
# Copy CA certificate
sudo cp corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

**macOS:**
```bash
# Add to system keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain corporate-ca.crt
```

**Windows:**
```powershell
# Import to Trusted Root Certification Authorities
Import-Certificate -FilePath corporate-ca.crt -CertStoreLocation Cert:\LocalMachine\Root
```

### 2. Use AWS VPC Endpoints

Configure AWS VPC endpoints to access Bedrock without going through your corporate proxy:

```bash
# Create VPC endpoint for Bedrock
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxx \
  --service-name com.amazonaws.us-east-1.bedrock-runtime \
  --route-table-ids rtb-xxxxx
```

### 3. Configure Proxy with Proper Certificates

If using a corporate proxy, configure it to use proper certificates:

```bash
export HTTPS_PROXY=https://proxy.company.com:8080
export NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.crt
```

## Verification

To verify the setting is working:

1. Start the backend with the environment variable set
2. Check the logs for the warning message:
   ```
   WARNING: TLS certificate validation is disabled. This should only be used in development/testing with trusted networks.
   ```
3. Try connecting to AWS Bedrock - it should now work without certificate errors

## Troubleshooting

### Still Getting Certificate Errors?

1. **Verify the environment variable is set:**
   ```bash
   echo $NODE_TLS_REJECT_UNAUTHORIZED
   # Should output: 0
   ```

2. **Restart the application** after setting the environment variable

3. **Check for other SSL/TLS settings** that might override this:
   - `AWS_CA_BUNDLE`
   - `NODE_EXTRA_CA_CERTS`
   - `SSL_CERT_FILE`

4. **Verify AWS credentials** are correct and have proper permissions

### Docker-Specific Issues

If using Docker, ensure the environment variable is passed to the container:

```bash
# Check environment variables in running container
docker exec <container-id> env | grep NODE_TLS
```

## Additional Resources

- [Node.js TLS Documentation](https://nodejs.org/api/tls.html)
- [AWS SDK for JavaScript Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

## Support

If you continue to experience certificate issues after following this guide, please:

1. Check your network/proxy configuration
2. Verify AWS Bedrock is accessible from your network
3. Contact your IT/Security team about certificate requirements
4. Review AWS Bedrock service availability in your region
