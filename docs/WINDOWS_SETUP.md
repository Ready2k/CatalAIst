# Windows Setup Guide

This guide helps you set up and run CatalAIst on Windows.

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop
   - Enable WSL 2 backend (recommended)

3. **Git for Windows**
   - Download from: https://git-scm.com/download/win
   - Use Git Bash for commands

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Ready2k/CatalAIst.git
cd CatalAIst

# Run setup script (in Git Bash)
./setup-docker.sh
```

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/Ready2k/CatalAIst.git
cd CatalAIst

# Build shared types (IMPORTANT!)
cd shared
npm install
npm run build
cd ..

# Install backend dependencies
cd backend
npm install
npm run build
cd ..

# Install frontend dependencies
cd frontend
npm install
npm run build
cd ..

# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

## Common Issues

### Issue 1: "Cannot read properties of undefined (reading 'safeParse')"

**Cause**: Shared types not compiled

**Solution**:
```bash
cd shared
npm run build
cd ../backend
npm run build
```

### Issue 2: Path Resolution Errors

**Cause**: Windows uses backslashes, Node.js expects forward slashes

**Solution**: The codebase now uses compiled JavaScript which handles this automatically. Make sure you've built the shared types.

### Issue 3: Docker Volumes on Windows

**Cause**: Windows file permissions differ from Linux

**Solution**: Use WSL 2 backend in Docker Desktop settings

### Issue 4: Port Already in Use

**Cause**: Another application is using port 80, 8080, or 3000

**Solution**:
```bash
# Find process using port
netstat -ano | findstr :8080

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## Building for Production

```bash
# Build shared types
cd shared
npm run build

# Build backend
cd ../backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

## Environment Variables

Create `.env` files in the backend directory:

```env
# Backend .env
JWT_SECRET=your-secret-key-here
PII_ENCRYPTION_KEY=your-encryption-key-here
CREDENTIALS_ENCRYPTION_KEY=your-credentials-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80
```

## Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### TypeScript Compilation Errors

If you see TypeScript errors:

1. Delete `node_modules` and `package-lock.json`
2. Reinstall dependencies: `npm install`
3. Rebuild: `npm run build`

### Module Resolution Errors

If you see "Cannot find module" errors:

1. Ensure shared types are built: `cd shared && npm run build`
2. Rebuild backend: `cd backend && npm run build`
3. Rebuild frontend: `cd frontend && npm run build`

### Docker Issues

If Docker containers won't start:

1. Check Docker Desktop is running
2. Enable WSL 2 backend in settings
3. Restart Docker Desktop
4. Run: `docker-compose down && docker-compose up --build`

## Performance Tips

1. **Use WSL 2**: Much faster file I/O than native Windows
2. **Exclude from Antivirus**: Add project folder to Windows Defender exclusions
3. **Use SSD**: Store project on SSD for better performance
4. **Close Unnecessary Apps**: Free up RAM and CPU

## Development Workflow

1. Make changes to code
2. If you changed shared types:
   ```bash
   cd shared
   npm run build
   ```
3. Backend auto-reloads with `npm run dev`
4. Frontend auto-reloads with `npm start`

## Getting Help

- Check the main README.md
- Review error logs in console
- Check Docker logs: `docker-compose logs`
- Open GitHub issue with error details

## Additional Resources

- [Node.js on Windows](https://nodejs.org/en/download/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/)
- [WSL 2 Setup](https://docs.microsoft.com/en-us/windows/wsl/install)
- [Git for Windows](https://git-scm.com/download/win)

---

**Last Updated**: November 10, 2025
