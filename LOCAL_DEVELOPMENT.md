# Local Development Setup (Without Docker)

Guide for running CatalAIst locally using `npm run dev` for development.

---

## 📋 Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+
- **Git**

Check versions:
```bash
node --version  # Should be v20+
npm --version   # Should be 9+
```

---

## 🚀 Quick Start (Fresh Machine)

### 1. Clone Repository

```bash
git clone <repository-url>
cd CatalAIst
```

### 2. Setup Environment Variables

```bash
# Create .env file in root
cat > .env << 'EOF'
# Security Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-this
PII_ENCRYPTION_KEY=your-pii-encryption-key-change-this
CREDENTIALS_ENCRYPTION_KEY=your-credentials-key-change-this

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Server Configuration
NODE_ENV=development
PORT=8080
DATA_DIR=./data
LOG_LEVEL=debug

# LLM Configuration (Optional)
DEFAULT_MODEL=gpt-4
DEFAULT_VOICE=alloy
EOF

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "PII_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "CREDENTIALS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
```

Or manually edit `.env` with your own secrets.

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Go back to root
cd ..
```

### 4. Build Backend (First Time)

```bash
cd backend
npm run build
```

This compiles TypeScript to JavaScript in `dist/` folder.

### 5. Create Data Directories

```bash
mkdir -p data/{sessions,audit-logs,prompts,audio,audio/cache,analytics,pii-mappings,decision-matrix,learning,users}
```

### 6. Create Admin User

```bash
cd backend
npm run create-admin:dev
```

Follow the prompts to create your admin account.

---

## 🏃 Running Development Servers

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

This starts the backend on **http://localhost:8080** with hot reload.

### Terminal 2: Frontend

```bash
cd frontend
npm start
```

This starts the frontend on **http://localhost:3000** with hot reload.

---

## 🌐 Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Health Check:** http://localhost:8080/health

---

## 🔧 Development Workflow

### Making Changes

**Backend Changes:**
1. Edit files in `backend/src/`
2. Save (auto-reloads with `ts-node-dev`)
3. Test at http://localhost:8080

**Frontend Changes:**
1. Edit files in `frontend/src/`
2. Save (auto-reloads with React dev server)
3. Test at http://localhost:3000

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Security tests (requires backend running)
./test-security.sh
```

---

## 📝 Environment Variables Explained

### Required

```bash
JWT_SECRET=<32+ random bytes>
# Used for signing JWT tokens
# Generate: openssl rand -base64 32
```

### Recommended

```bash
PII_ENCRYPTION_KEY=<32+ random bytes>
# Used for encrypting PII data
# Generate: openssl rand -base64 32

CREDENTIALS_ENCRYPTION_KEY=<32+ random bytes>
# Used for encrypting user credentials
# Generate: openssl rand -base64 32

ALLOWED_ORIGINS=http://localhost:3000
# Frontend URL for CORS
# Add multiple: http://localhost:3000,http://localhost:8080
```

### Optional

```bash
NODE_ENV=development
# Set to 'production' for production builds

PORT=8080
# Backend port (default: 8080)

DATA_DIR=./data
# Where to store data files

LOG_LEVEL=debug
# Logging level: debug, info, warn, error
```

---

## 🔐 API Configuration

### Frontend API URL

The frontend needs to know where the backend is:

**Option 1: Environment Variable**

Create `frontend/.env.local`:
```bash
REACT_APP_API_URL=http://localhost:8080
```

**Option 2: Proxy (Recommended)**

Already configured in `frontend/package.json`:
```json
{
  "proxy": "http://localhost:8080"
}
```

With proxy, frontend can use relative URLs:
```javascript
fetch('/api/auth/login')  // Proxied to http://localhost:8080/api/auth/login
```

---

## 🐛 Troubleshooting

### "JWT_SECRET not configured"

**Solution:** Make sure `.env` file exists in root with `JWT_SECRET` set.

```bash
# Check if .env exists
cat .env | grep JWT_SECRET

# If missing, add it
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

### "Port 8080 already in use"

**Solution:** Change port in `.env`:
```bash
PORT=8081
```

Or kill the process using port 8080:
```bash
lsof -ti:8080 | xargs kill
```

### "Cannot find module"

**Solution:** Reinstall dependencies:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### "CORS Error"

**Solution:** Make sure `ALLOWED_ORIGINS` includes your frontend URL:
```bash
# In .env
ALLOWED_ORIGINS=http://localhost:3000
```

### Backend won't start

**Check logs:**
```bash
cd backend
npm run dev
# Look for error messages
```

**Common issues:**
- Missing `.env` file
- Missing `JWT_SECRET`
- Port already in use
- Missing dependencies

### Frontend won't start

**Check logs:**
```bash
cd frontend
npm start
# Look for error messages
```

**Common issues:**
- Missing dependencies
- Port 3000 in use
- Node version too old

---

## 📦 Building for Production

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
# Outputs to frontend/build/
```

Serve with a static server:
```bash
npx serve -s build -p 3000
```

---

## 🔄 Updating to v2.1

If you already have v2.0 running locally:

```bash
# 1. Pull latest code
git pull

# 2. Install new dependencies (if any)
cd backend
npm install

cd ../frontend
npm install

# 3. Rebuild backend
cd ../backend
npm run build

# 4. Restart dev servers
# Terminal 1: npm run dev (backend)
# Terminal 2: npm start (frontend)
```

---

## 🎯 Quick Commands Reference

```bash
# Setup (first time)
npm install                          # In backend/ and frontend/
npm run build                        # In backend/
npm run create-admin:dev             # In backend/

# Development
npm run dev                          # Backend (port 8080)
npm start                            # Frontend (port 3000)

# Testing
npm test                             # Backend tests
./test-security.sh                   # Security tests

# Building
npm run build                        # Backend or frontend

# Admin management
npm run create-admin:dev             # Create admin user
```

---

## 📚 Project Structure

```
CatalAIst/
├── backend/
│   ├── src/                    # TypeScript source
│   │   ├── index.ts           # Entry point
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, etc.
│   │   └── scripts/           # Utility scripts
│   ├── dist/                  # Compiled JavaScript
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/                   # React source
│   │   ├── App.tsx           # Main component
│   │   ├── components/       # UI components
│   │   └── services/         # API service
│   ├── public/
│   └── package.json
├── shared/
│   └── types.ts              # Shared TypeScript types
├── data/                     # Application data (gitignored)
├── .env                      # Environment variables (gitignored)
└── .env.example              # Example environment file
```

---

## 🔒 Security Notes

### Development vs Production

**Development:**
- Uses `npm run dev` with hot reload
- Detailed error messages
- Debug logging
- CORS allows localhost

**Production:**
- Uses compiled code (`npm start`)
- Generic error messages
- Minimal logging
- CORS restricted to your domain
- HTTPS required

### Secrets Management

**Never commit:**
- `.env` file
- `data/` directory
- API keys
- Passwords

**Always:**
- Use `.env.example` as template
- Generate unique secrets per environment
- Use strong random values
- Rotate secrets regularly

---

## 💡 Tips

### Hot Reload

Both backend and frontend support hot reload:
- **Backend:** `ts-node-dev` watches for changes
- **Frontend:** React dev server watches for changes

Just save your files and see changes instantly!

### Debugging

**Backend:**
```bash
# Add breakpoints in VS Code
# Or use console.log
console.log('Debug:', variable);
```

**Frontend:**
```javascript
// Use React DevTools
// Or browser console
console.log('Debug:', variable);
```

### Database/Storage

CatalAIst uses file-based storage in `data/` directory:
- `data/users/` - User accounts
- `data/sessions/` - User sessions
- `data/audit-logs/` - Audit trail
- `data/pii-mappings/` - Encrypted PII

No database setup required!

---

## 🆚 Docker vs Local Development

### Use Docker When:
- ✅ Quick setup needed
- ✅ Production-like environment
- ✅ Multiple services
- ✅ Consistent environment

### Use Local Development When:
- ✅ Active development
- ✅ Debugging needed
- ✅ Hot reload wanted
- ✅ Learning the codebase

### Best of Both:
- Develop locally with `npm run dev`
- Test with Docker before deploying
- Deploy with Docker in production

---

## 📞 Need Help?

### Check Documentation
- `README.md` - Main documentation
- `SECURITY_SETUP.md` - Security configuration
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide

### Common Issues
- Check `.env` file exists and has required variables
- Verify Node.js version (20+)
- Check ports 3000 and 8080 are available
- Ensure dependencies are installed

### Still Stuck?
- Check backend logs: `npm run dev` output
- Check frontend logs: `npm start` output
- Check browser console for errors
- Review `TROUBLESHOOTING.md`

---

**Happy coding! 🚀**
