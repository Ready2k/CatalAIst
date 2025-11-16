# CatalAIst - AI-Powered Process Classification System

**Version 3.0.0** - Voice Interface & Enhanced Session Management

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

## ✨ What's New in v3.0

### 👥 Blind Evaluation Workflow (Human-in-the-Loop)

- **User Submission** - Regular users submit processes without seeing AI results
- **Thank You Message** - Users get confirmation without classification (reduces bias)
- **Admin Review** - Admins review and approve/correct each classification
- **Review Dashboard** - Statistics on pending, approved, and corrected reviews
- **Quality Control** - Human oversight ensures classification accuracy
- **Learning Data** - Admin corrections provide training data for AI improvement
- **Role-Based Access** - Users see only Classifier/Configuration, Admins see all features

**Documentation:** See [Blind Evaluation Workflow Guide](docs/BLIND_EVALUATION_WORKFLOW.md)

### 🎤 Complete Voice Interface

- **Speech-to-Text** - Record audio and get instant transcription using OpenAI Whisper
- **Text-to-Speech** - Questions read aloud automatically using OpenAI TTS
- **Two Modes:**
  - **Non-Streaming** (Default) - Manual control, edit transcripts before sending
  - **Streaming** - Automatic conversational flow, hands-free operation
- **6 Voice Options** - Choose from alloy, echo, fable, onyx, nova, shimmer
- **Visual Feedback** - Recording timer, waveform display, color-coded warnings
- **Auto-Fallback** - Switches to non-streaming mode on errors
- **Full Accessibility** - Keyboard navigation, screen reader support, WCAG AA compliant

**Documentation:** See [Voice Features Guide](docs/VOICE_FEATURES_GUIDE.md) and [Troubleshooting](docs/VOICE_TROUBLESHOOTING.md)

### 🔄 Enhanced Session Management

- **Start Fresh Button** - Clear current session and begin new classification
- **Enhanced Logout** - Deletes active session from backend for clean state
- **Better Control** - Easy to start over or switch between classifications
- **Confirmation Dialogs** - Prevents accidental data loss

### 🐛 Critical Bug Fixes

- **Voice Authentication** - Fixed JWT token authentication for voice endpoints
- **API Configuration** - Fixed OpenAI service call format for voice features
- **API Key Fallback** - Improved API key detection and error handling

**Access:** Voice button (🎤) appears when using OpenAI provider

---

## ✨ What's New in v2.3

### 🔧 Critical Bedrock Fixes

- **Loop Detection** - Automatic detection and breaking of infinite clarification loops
- **Token Optimization** - 60% reduction in token usage for long conversations (smart summarization)
- **Session Persistence** - 100% session save success rate (fixed schema validation errors)
- **LLM Observability** - Full logging of LLM prompts and responses in audit trail
- **Error Recovery** - Graceful handling of malformed LLM responses

### 🚀 Admin Reclassification

- **One-Click Reclassification** - Re-evaluate sessions with current decision matrix
- **Visual Comparison** - See before/after classification side-by-side
- **Quality Assurance** - Verify and improve classifications
- **Model Comparison** - Test different models on same session
- **Full Audit Trail** - Complete tracking of all reclassifications

**Access:** Analytics Dashboard → Session Detail → Classification Tab → 🔄 Reclassify Button

## ✨ What's New in v2.2

### ♿ Full Accessibility (WCAG 2.1 AA)

- **Screen Reader Support** - Complete ARIA labels and live regions
- **Keyboard Navigation** - Full keyboard access (Tab, Enter, Space, Escape)
- **Focus Indicators** - Visible 3px blue outlines on all interactive elements
- **Color Contrast** - Minimum 4.5:1 ratio on all text (exceeds standards)
- **Touch Targets** - Minimum 44x44px on mobile for easy interaction
- **Responsive Design** - Accessible on all devices and screen sizes
- **Documentation** - Comprehensive accessibility testing guide

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
- **Enhanced Analytics** - Fully accessible with keyboard navigation and screen reader support

### Accessibility Features

- ✅ WCAG 2.1 AA compliant
- ✅ Full keyboard navigation
- ✅ Screen reader announcements
- ✅ ARIA labels and roles
- ✅ Visible focus indicators
- ✅ 4.5:1 color contrast minimum
- ✅ 14px minimum font size
- ✅ 44x44px touch targets on mobile
- ✅ Responsive design
- ✅ Tested with NVDA, JAWS, VoiceOver

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

All documentation has been organized in the `/docs` directory:

- **[docs/setup/](docs/setup/)** - Setup guides, Docker, AWS Bedrock, ports, HTTPS
- **[docs/deployment/](docs/deployment/)** - Production deployment guides
- **[docs/security/](docs/security/)** - Security configuration and audits
- **[docs/releases/](docs/releases/)** - Release notes and changelogs
- **[docs/fixes/](docs/fixes/)** - Bug fixes and improvements
- **[docs/VOICE_FEATURES_GUIDE.md](docs/VOICE_FEATURES_GUIDE.md)** - Complete voice interface guide
- **[docs/VOICE_TROUBLESHOOTING.md](docs/VOICE_TROUBLESHOOTING.md)** - Voice troubleshooting guide

See **[docs/README.md](docs/README.md)** for the complete documentation index.

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

**Self-signed certificate errors (AWS Bedrock)**

If you're behind a corporate proxy/firewall with self-signed certificates:

```bash
# Add to docker-compose.yml or .env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

⚠️ **Only use in development/testing!** See [backend/docs/SELF_SIGNED_CERTIFICATES.md](backend/docs/SELF_SIGNED_CERTIFICATES.md) for production solutions.

**Voice features not working**

See the comprehensive [Voice Troubleshooting Guide](docs/VOICE_TROUBLESHOOTING.md) for:
- Microphone permission issues
- Transcription failures
- Audio playback problems
- Browser compatibility
- Network issues

### Getting Help

1. Check documentation in root directory
2. View logs: `docker-compose logs -f backend`
3. Run health check: `curl http://localhost:8080/health`
4. Check issues on GitHub

---

## ❓ Voice Features FAQ

### Getting Started

**Q: How do I enable voice features?**  
A: Voice is automatically enabled when you select OpenAI as your LLM provider. Just enter your API key and you'll see the 🎤 microphone button.

**Q: Can I use voice with AWS Bedrock?**  
A: Not yet. Voice features currently require OpenAI. Bedrock support is planned for a future release.

**Q: Do I need special hardware?**  
A: Just a working microphone. Built-in laptop/phone microphones work fine.

### Using Voice

**Q: What's the difference between streaming and non-streaming mode?**  
A: 
- **Non-streaming (default)**: Manual control, edit transcripts before sending
- **Streaming**: Automatic conversational flow, hands-free operation

See the [Voice Features Guide](docs/VOICE_FEATURES_GUIDE.md) for detailed comparison.

**Q: How long can I record?**  
A: Maximum 5 minutes per recording. This is sufficient for most descriptions. You can record in segments if needed.

**Q: Can I edit transcripts before submitting?**  
A: Yes, in non-streaming mode. Streaming mode auto-submits for conversational flow.

**Q: Can I switch between voice and text?**  
A: Yes! Text input is always available. Use whichever is more convenient.

### Troubleshooting

**Q: Why can't I see the microphone button?**  
A: Voice requires OpenAI provider. Check your configuration and ensure you've entered an API key.

**Q: Why does my browser ask for microphone permission?**  
A: This is a security feature. Grant permission to use voice features.

**Q: Why is transcription inaccurate?**  
A: Speak clearly in a quiet environment. You can edit transcripts in non-streaming mode before submitting.

**Q: Why does streaming mode keep stopping?**  
A: It detects 2 seconds of silence. Speak continuously or switch to non-streaming mode for manual control.

### Privacy & Cost

**Q: Is my voice data stored?**  
A: No. Audio is transcribed and then deleted. Only text transcripts are stored (with PII encryption).

**Q: Does voice cost extra?**  
A: Voice uses your OpenAI API credits. STT costs ~$0.006/minute, TTS costs ~$0.015/1K characters.

**Q: Is voice data encrypted?**  
A: Yes. Transcripts follow the same PII detection and encryption as text input.

For more questions, see the complete [Voice Features Guide](docs/VOICE_FEATURES_GUIDE.md).

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

### v3.0.0 (2025-11-14) - Voice Interface & Session Management

- ✅ Complete voice interface (STT + TTS)
- ✅ Two voice modes (streaming and non-streaming)
- ✅ 6 voice options to choose from
- ✅ Start Fresh button for session control
- ✅ Enhanced logout with backend cleanup
- ✅ Comprehensive voice documentation (1,500+ lines)
- ✅ Critical bug fixes for voice features
- ✅ Full accessibility compliance
- ✅ Developer patterns and guidelines

### v2.3.0 (2025-11-12) - Bedrock Fixes & Reclassification

- ✅ Fixed JSON schema validation errors (targetCategory array)
- ✅ Automatic loop detection and breaking
- ✅ Smart context summarization (60% token reduction)
- ✅ Full LLM prompt/response logging
- ✅ 100% session save success rate
- ✅ Admin reclassification feature with UI
- ✅ Complete observability and debugging

### v2.2.0 (2025-11-10) - Full Accessibility

- ✅ WCAG 2.1 AA compliance
- ✅ Complete keyboard navigation
- ✅ Screen reader support
- ✅ Responsive design
- ✅ Touch-friendly mobile interface

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
