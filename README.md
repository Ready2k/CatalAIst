# CatalAIst - AI-Powered Process Classification System

**Version 2.0.0** - Production-Ready with Enterprise Security

CatalAIst is an intelligent system that classifies business processes into transformation categories using AI, helping organizations identify the best approach for process improvement.

---

## 🚀 Quick Start

### One-Command Setup

```bash
./setup-docker.sh
```

This will:
- Generate secure secrets
- Build Docker images
- Start all services
- Create admin user
- Run security tests

**Time:** 3-5 minutes

### Access the Application

- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:8080
- **Health Check:** http://localhost:8080/health

---

## ✨ What's New in v2.0

### 🔐 Enterprise Security

- **JWT Authentication** - Secure user authentication with role-based access
- **Rate Limiting** - Protection against DoS and API abuse
- **CORS Protection** - Restricted to configured origins
- **Security Headers** - Comprehensive HTTP security (Helmet.js)
- **Encrypted Storage** - PII and credentials encrypted with AES-256-GCM
- **Audit Logging** - Complete audit trail of all actions

### 🎨 Modern UI

- **Login/Registration** - Beautiful authentication interface
- **User Management** - Admin and user roles
- **Session Management** - Secure JWT token handling
- **Responsive Design** - Works on desktop, tablet, and mobile

### 🐳 Production-Ready Deployment

- **Docker Compose** - One-command deployment
- **Health Checks** - Automatic container monitoring
- **Data Persistence** - Docker volumes for data
- **Non-root Containers** - Enhanced security
- **HTTPS Ready** - Easy SSL/TLS configuration

---

## 📋 Features

### Core Functionality

- **AI Classification** - Classifies processes into 6 transformation categories:
  - Eliminate - Remove unnecessary processes
  - Simplify - Streamline and reduce complexity
  - Digitise - Convert manual to digital
  - RPA - Robotic Process Automation
  - AI Agent - AI-powered assistance
  - Agentic AI - Autonomous AI decision-making

- **Intelligent Clarification** - Asks targeted questions to improve accuracy
- **Decision Matrix** - Rule-based logic for consistent classification
- **Learning System** - Improves over time from feedback
- **Voice Interface** - Speech-to-text and text-to-speech support
- **Analytics Dashboard** - Track classification patterns and accuracy

### Security Features

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Role-based access control
- ✅ User management (admin GUI)
- ✅ Rate limiting (3-tier system)
- ✅ CORS protection
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ PII detection and encryption
- ✅ Audit logging
- ✅ Request tracking

### LLM Support

- **OpenAI** - GPT-4, GPT-3.5-turbo, GPT-4o
- **AWS Bedrock** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Configurable** - Easy to add new providers

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Docker Host                     │
│                                              │
│  ┌────────────────┐    ┌─────────────────┐ │
│  │   Frontend     │    │    Backend      │ │
│  │   (Port 80)    │◄───┤   (Port 8080)   │ │
│  │   React + Nginx│    │   Node.js       │ │
│  └────────────────┘    └─────────────────┘ │
│                              │               │
│                              ▼               │
│                    ┌──────────────────┐     │
│                    │  Data Volume     │     │
│                    │  - Users         │     │
│                    │  - Sessions      │     │
│                    │  - Audit Logs    │     │
│                    │  - PII Mappings  │     │
│                    └──────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

- Docker and Docker Compose
- 2GB RAM minimum
- 10GB disk space

### Quick Install

```bash
# Clone repository
git clone <repository-url>
cd CatalAIst

# Run setup
./setup-docker.sh
```

### Manual Install

```bash
# 1. Create environment file
cp .env.example .env

# 2. Generate secrets
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for PII_ENCRYPTION_KEY
openssl rand -base64 32  # Use for CREDENTIALS_ENCRYPTION_KEY

# 3. Edit .env with your secrets
nano .env

# 4. Build and start
docker-compose build
docker-compose up -d

# 5. Create admin user
docker-compose exec backend npm run create-admin

# 6. Verify
curl http://localhost:8080/health
```

---

## 🔧 Configuration

### Environment Variables

#### Required

```bash
JWT_SECRET=<32+ random bytes>
```

#### Recommended

```bash
PII_ENCRYPTION_KEY=<32+ random bytes>
CREDENTIALS_ENCRYPTION_KEY=<32+ random bytes>
ALLOWED_ORIGINS=https://your-domain.com
```

#### Optional

```bash
NODE_ENV=production
PORT=8080
DATA_DIR=/data
LOG_LEVEL=info
DEFAULT_MODEL=gpt-4
DEFAULT_VOICE=alloy
```

### LLM Configuration

Users can configure their own LLM credentials:

**OpenAI:**
- API Key
- Model selection (GPT-4, GPT-3.5-turbo, etc.)

**AWS Bedrock:**
- AWS Access Key ID
- AWS Secret Access Key
- AWS Region
- Model selection (Claude 3.5 Sonnet, etc.)

---

## 📖 Usage

### 1. Login

Visit http://localhost:80 and login with your admin credentials.

### 2. Configure LLM

Go to Configuration tab and enter your OpenAI API key or AWS credentials.

### 3. Classify a Process

1. Enter process description
2. Answer clarification questions (if any)
3. Review classification result
4. Provide feedback

### 4. View Analytics

Check the Analytics dashboard to see:
- Classification distribution
- Confidence trends
- Feedback patterns
- Model performance

---

## 🔐 Security

### Authentication

- JWT tokens with 24-hour expiration
- Bcrypt password hashing (10 rounds)
- Role-based access control (admin/user)

### Rate Limiting

- General API: 100 requests / 15 minutes
- LLM endpoints: 10 requests / minute
- Auth endpoints: 5 attempts / 15 minutes

### Data Protection

- PII automatically detected and encrypted
- User credentials encrypted (AES-256-GCM)
- Audit logs for all actions
- Secure session management

### HTTPS

For production, use nginx or Caddy for SSL termination:

```bash
# See DOCKER_SECURITY_SETUP.md for details
```

---

## 📊 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "username": "john_doe",
  "password": "SecurePassword123!"
}

# Login
POST /api/auth/login
{
  "username": "john_doe",
  "password": "SecurePassword123!"
}

# Get current user
GET /api/auth/me
Authorization: Bearer <token>
```

### Classification

```bash
# Submit process
POST /api/process/submit
Authorization: Bearer <token>
{
  "description": "Process description here"
}

# Answer clarification
POST /api/process/clarify
Authorization: Bearer <token>
{
  "sessionId": "uuid",
  "answers": ["answer1", "answer2"]
}
```

### Admin

```bash
# Get analytics
GET /api/analytics
Authorization: Bearer <token>

# Update decision matrix
PUT /api/decision-matrix
Authorization: Bearer <token>

# View audit logs
GET /api/audit/logs?date=2025-11-09
Authorization: Bearer <token>
```

---

## 🛠️ Development

### Local Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Security tests
docker-compose exec backend ./test-security.sh
```

### Building

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

---

## 📚 Documentation

### Quick Start Guides

- **CRITICAL_FIXES_SUMMARY.md** - 5-minute quick start
- **DOCKER_README.md** - Complete Docker guide
- **DOCKER_QUICK_REFERENCE.md** - Command reference

### Security

- **SECURITY_SETUP.md** - Security configuration
- **SECURITY_AUDIT_REPORT.md** - Security audit results
- **SECURITY_UPDATES.md** - Security changelog

### Deployment

- **DEPLOYMENT_CHECKLIST.md** - Production deployment
- **DOCKER_SECURITY_SETUP.md** - Docker security
- **CORS_FIX.md** - CORS troubleshooting

### Features

- **FRONTEND_AUTH_UPDATE.md** - Authentication guide
- **decision-matrix-flow-visualization.md** - Decision matrix UI
- **prompt-management-policy.md** - Prompt management

---

## 🐛 Troubleshooting

### Common Issues

**"JWT_SECRET not configured"**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
docker-compose restart backend
```

**"Not allowed by CORS"**
```bash
./fix-cors.sh
```

**"ts-node: command not found"**
```bash
./fix-docker-admin.sh
```

**Can't login**
```bash
docker-compose exec backend npm run create-admin
```

### Getting Help

1. Check documentation in root directory
2. View logs: `docker-compose logs -f backend`
3. Run health check: `curl http://localhost:8080/health`
4. Check issues on GitHub

---

## 🔄 Updating

### Update to Latest Version

```bash
# Pull latest code
git pull

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Backup Before Update

```bash
# Backup data
docker run --rm \
  -v catalai_catalai-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Backup .env
cp .env .env.backup
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

[Your License Here]

---

## 🙏 Acknowledgments

- OpenAI for GPT models
- AWS for Bedrock
- React and Node.js communities
- All contributors

---

## 📞 Support

- **Documentation:** See docs in root directory
- **Issues:** GitHub Issues
- **Security:** Report privately to security@example.com

---

## 🗺️ Roadmap

### v2.1 (Planned)

- [ ] Password reset flow
- [ ] 2FA support
- [ ] User profile management
- [ ] Advanced analytics
- [ ] Export functionality

### v2.2 (Planned)

- [ ] Multi-language support
- [ ] Custom themes
- [ ] API webhooks
- [ ] Batch processing
- [ ] Advanced reporting

---

## 📈 Version History

### v2.1.0 (2025-11-09) - User Management

- ✅ User management GUI (admin only)
- ✅ Role management (admin/user)
- ✅ Password reset (admin can reset any user)
- ✅ User deletion with safety checks
- ✅ User statistics and monitoring

### v2.0.0 (2025-11-09) - Security & Authentication

- ✅ JWT authentication system
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Security headers
- ✅ Login/registration UI
- ✅ User management
- ✅ Encrypted credential storage
- ✅ Complete audit logging

### v1.2.0 - Decision Matrix & Learning

- Decision matrix flow visualization
- AI learning system
- Prompt management
- Analytics improvements

### v1.0.0 - Initial Release

- Core classification engine
- OpenAI integration
- Basic UI
- Session management

---

## 🎯 Quick Commands

```bash
# Start everything
./setup-docker.sh

# Create admin
docker-compose exec backend npm run create-admin

# View logs
docker-compose logs -f backend

# Restart
docker-compose restart

# Stop
docker-compose down

# Backup
docker run --rm -v catalai_catalai-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data

# Update
git pull && docker-compose build && docker-compose up -d
```

---

**Ready to get started?** Run `./setup-docker.sh` and you'll be up in 5 minutes! 🚀
