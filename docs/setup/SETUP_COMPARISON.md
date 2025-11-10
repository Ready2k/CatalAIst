# Setup Comparison - Docker vs Local Development

Quick reference for choosing the right setup method.

---

## 🎯 Which Setup Should I Use?

### Fresh Machine - Docker (Recommended)
```bash
./setup-docker.sh
```
**Best for:** Production, quick start, consistent environment

### Fresh Machine - Local Development
```bash
./setup-local-dev.sh
```
**Best for:** Active development, debugging, learning codebase

### Existing Installation - Update
```bash
./update-v2.1.sh
```
**Best for:** Upgrading from v2.0 to v2.1 (Docker only)

---

## 📊 Comparison Table

| Feature | Docker | Local Dev |
|---------|--------|-----------|
| **Setup Time** | 3-5 minutes | 5-10 minutes |
| **Prerequisites** | Docker only | Node.js 20+ |
| **Hot Reload** | ❌ No | ✅ Yes |
| **Debugging** | ⚠️ Limited | ✅ Full |
| **Production-like** | ✅ Yes | ❌ No |
| **Port Conflicts** | Rare | Common |
| **Resource Usage** | Higher | Lower |
| **Isolation** | ✅ Complete | ❌ None |

---

## 🚀 Quick Start Commands

### Docker Setup

```bash
# Fresh install
./setup-docker.sh

# Update existing
./update-v2.1.sh

# Access
http://localhost:80
```

### Local Development Setup

```bash
# Fresh install
./setup-local-dev.sh

# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)
cd frontend && npm start

# Access
http://localhost:3000
```

---

## 📝 Detailed Guides

### Docker
- **Setup:** `setup-docker.sh`
- **Update:** `update-v2.1.sh`
- **Docs:** `DOCKER_README.md`
- **Quick Ref:** `DOCKER_QUICK_REFERENCE.md`

### Local Development
- **Setup:** `setup-local-dev.sh`
- **Docs:** `LOCAL_DEVELOPMENT.md`
- **Main:** `README.md`

---

## 🔄 Switching Between Setups

### Docker → Local Dev

```bash
# 1. Stop Docker
docker-compose down

# 2. Setup local dev
./setup-local-dev.sh

# 3. Start dev servers
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm start
```

### Local Dev → Docker

```bash
# 1. Stop dev servers (Ctrl+C in both terminals)

# 2. Start Docker
docker-compose up -d

# 3. Access at http://localhost:80
```

---

## 💡 Recommendations

### Use Docker If:
- ✅ You want quick setup
- ✅ You're deploying to production
- ✅ You want consistent environment
- ✅ You're not actively developing

### Use Local Dev If:
- ✅ You're actively coding
- ✅ You need hot reload
- ✅ You're debugging issues
- ✅ You're learning the codebase

### Best Practice:
1. **Develop** locally with hot reload
2. **Test** with Docker before deploying
3. **Deploy** with Docker in production

---

## 🎓 Learning Path

### Beginner
1. Start with Docker (`./setup-docker.sh`)
2. Explore the UI
3. Understand the features

### Intermediate
1. Switch to local dev (`./setup-local-dev.sh`)
2. Make small changes
3. See hot reload in action

### Advanced
1. Develop locally
2. Test with Docker
3. Deploy to production

---

## 📞 Quick Help

### Docker Issues
- Check: `docker-compose logs backend`
- Rebuild: `docker-compose build --no-cache`
- Docs: `DOCKER_README.md`

### Local Dev Issues
- Check: Terminal output
- Rebuild: `npm run build` in backend
- Docs: `LOCAL_DEVELOPMENT.md`

---

## ✅ Summary

| Scenario | Command |
|----------|---------|
| Fresh machine (Docker) | `./setup-docker.sh` |
| Fresh machine (Local) | `./setup-local-dev.sh` |
| Update Docker install | `./update-v2.1.sh` |
| Update local install | `git pull && npm install` |

**Choose Docker for production, Local Dev for development!** 🚀
