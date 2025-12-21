# CatalAIst Technology Stack

## Architecture
- **Frontend**: React 18.3.1 with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Deployment**: Docker Compose with multi-container setup
- **Database**: File-based JSON storage with encryption
- **Authentication**: JWT with bcrypt password hashing

## Key Technologies

### Backend Stack
- **Runtime**: Node.js with TypeScript (ES2020 target)
- **Framework**: Express.js with Helmet security headers
- **Authentication**: JWT tokens, bcryptjs for password hashing
- **Rate Limiting**: express-rate-limit (3-tier system)
- **File Upload**: Multer for audio file handling
- **WebSockets**: ws library for real-time communication
- **Validation**: Zod schemas for type-safe validation
- **Security**: CORS protection, PII encryption (AES-256-GCM)

### Frontend Stack
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Flow Diagrams**: @xyflow/react for decision matrix visualization
- **Layout**: Dagre for automatic graph layout
- **Accessibility**: WCAG 2.1 AA compliant

### LLM Integration
- **OpenAI**: openai ^4.104.0 (GPT models, Whisper STT, TTS)
- **AWS Bedrock**: @aws-sdk/client-bedrock-runtime ^3.932.0 (Claude, Nova models)
- **Voice Services**: Amazon Transcribe, Polly, OpenAI Whisper/TTS

### Development Tools
- **TypeScript**: Strict mode enabled, shared types package
- **Testing**: Jest with ts-jest for backend testing
- **Development**: ts-node-dev for hot reloading
- **Linting**: ESLint with React app configuration

## Common Commands

### Docker Mode (Production)
```bash
# Initial setup (first time only)
./catalai.sh setup

# Daily operations
./catalai.sh start          # Start services (ports 80/8080)
./catalai.sh stop           # Stop services
./catalai.sh restart        # Restart services
./catalai.sh status         # Check service status
./catalai.sh logs -f        # Follow logs
./catalai.sh health         # Health check

# Maintenance
./catalai.sh build          # Rebuild images
./catalai.sh backup         # Backup data
./catalai.sh admin          # Create admin user
./catalai.sh clean          # Clean up containers/volumes
```

### Local Development Mode
```bash
# Initial setup
./catalai.sh setup --local

# Development operations
./catalai.sh start --local   # Start services (ports 4000/4001)
./catalai.sh stop --local    # Stop services
./catalai.sh status --local  # Check status
./catalai.sh health --local  # Health check
```

### Manual Development Commands
```bash
# Backend development
cd backend
npm install
npm run dev                 # Start with hot reload
npm run build              # Build TypeScript
npm test                   # Run tests
npm run create-admin:dev   # Create admin user

# Frontend development  
cd frontend
npm install
npm start                  # Start dev server
npm run build             # Build for production
npm test                  # Run tests

# Shared types
cd shared
npm install
npm run build             # Build shared types
```

### Docker Commands (Legacy)
```bash
# Container management
docker-compose up -d       # Start in background
docker-compose down        # Stop and remove
docker-compose logs -f     # Follow logs
docker-compose restart     # Restart services

# Admin user creation
docker-compose exec backend npm run create-admin
```

## Build System
- **Backend**: TypeScript compilation to CommonJS in `dist/` directory
- **Frontend**: Create React App build system with webpack
- **Shared**: TypeScript compilation for shared type definitions
- **Docker**: Multi-stage builds with production optimization

## Environment Configuration
- **Required**: JWT_SECRET (32+ random bytes)
- **Recommended**: PII_ENCRYPTION_KEY, CREDENTIALS_ENCRYPTION_KEY
- **Optional**: NODE_ENV, LOG_LEVEL, DEFAULT_MODEL, DEFAULT_VOICE
- **CORS**: ALLOWED_ORIGINS for production security

## Port Configuration
- **Docker Mode**: Frontend (80), Backend (8080)
- **Local Mode**: Frontend (4001), Backend (4000)
- **Health Checks**: Available at `/health` endpoint