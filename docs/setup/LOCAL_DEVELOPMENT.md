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
# Copy example files
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Generate secure secrets (Mac/Linux)
sed -i '' "s/your-super-secret-jwt-key-change-this/$(openssl rand -base64 32)/" .env
sed -i '' "s/your-pii-encryption-key-change-this/$(openssl rand -base64 32)/" .env
sed -i '' "s/your-credentials-key-change-this/$(openssl rand -base64 32)/" .env
```

Or manually edit `.env` and `frontend/.env.local` with your own secrets.

**Key settings:**
- Backend runs on port **4000**
- Frontend runs on port **4001**
- Frontend knows to call backend at `http://localhost:4000`

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

This starts the backend on **http://localhost:4000** with hot reload.

### Terminal 2: Frontend

```bash
cd frontend
npm start
```

This starts the frontend on **http://localhost:4001** with hot reload.

---

## 🌐 Access the Application

- **Frontend:** http://localhost:4001
- **Backend API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

---

## 🔧 Development Workflow

### Making Changes

**Backend Changes:**
1. Edit files in `backend/src/`
2. Save (auto-reloads with `ts-node-dev`)
3. Test at http://localhost:4000

**Frontend Changes:**
1. Edit files in `frontend/src/`
2. Save (auto-reloads with React dev server)
3. Test at http://localhost:4001

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

ALLOWED_ORIGINS=http://localhost:4001
# Frontend URL for CORS
# Add multiple: http://localhost:4001,http://localhost:3000
```

### Optional

```bash
NODE_ENV=development
# Set to 'production' for production builds

PORT=4000
# Backend port (default: 4000 for local dev)

DATA_DIR=./data
# Where to store data files

LOG_LEVEL=debug
# Logging level: debug, info, warn, error
```

---

## 🔐 API Configuration

### Frontend API URL

The frontend is pre-configured to connect to the backend:

**Configuration in `frontend/.env.local`:**
```bash
PORT=4001
REACT_APP_API_URL=http://localhost:4000
```

This tells the frontend:
- Run on port 4001
- Make API calls to backend at http://localhost:4000

**Proxy fallback** in `frontend/package.json`:
```json
{
  "proxy": "http://localhost:4000"
}
```

Both methods work, but the explicit `REACT_APP_API_URL` is clearer.

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

### "Port 4000 already in use"

**Solution:** Kill the process using port 4000:
```bash
# Mac/Linux
lsof -ti:4000 | xargs kill

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

Or change port in `.env` (and update `frontend/.env.local` to match):
```bash
PORT=4002
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
ALLOWED_ORIGINS=http://localhost:4001
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
- Port 4001 in use
- Node version too old
- Missing `frontend/.env.local` file

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
npm run dev                          # Backend (port 4000)
npm start                            # Frontend (port 4001)

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
