# CatalAIst

AI-powered business process transformation classifier that helps organizations determine the optimal transformation approach for their processes using OpenAI's GPT models.

## Features

### 🎯 Intelligent Classification
- **6-tier transformation framework**: Eliminate → Simplify → Digitise → RPA → AI Agent → Agentic AI
- **Confidence-based routing**: Auto-classify high confidence, ask clarifying questions for medium confidence, flag low confidence for manual review
- **Sequential evaluation**: Ensures processes are evaluated in the correct order of transformation maturity

### 💬 Conversational Interface
- **Natural language input**: Describe processes in plain English
- **Clarification questions**: AI asks follow-up questions when needed for better accuracy
- **Voice support**: Speech-to-text input and text-to-speech output (optional)

### 📊 Admin Dashboard
- **Analytics**: Track classification accuracy, user satisfaction, and system performance
- **Decision Matrix**: Configure and version business rules that influence classifications
- **AI Learning**: Review AI-generated suggestions for improving classification accuracy
- **Prompt Management**: Edit and version system prompts with full audit trail
- **Audit Trail**: Complete session-based audit log with PII scrubbing indicators

### 🔒 Security & Compliance
- **PII Detection & Scrubbing**: Automatic detection and anonymization of sensitive data
- **Audit Logging**: Comprehensive JSONL-based audit trail with daily rotation
- **Session-based tracking**: Full traceability from input to classification to feedback
- **Data persistence**: All data stored in Docker volumes, survives container restarts

### 🤖 AI-Powered Learning
- **Feedback loop**: Captures user feedback on classification accuracy
- **Pattern detection**: Identifies common misclassifications and improvement opportunities
- **Suggestion engine**: Generates recommendations for prompt and decision matrix improvements
- **Version control**: All prompts and decision matrices are versioned with full history

## Project Structure

```
catalai-classifier/
├── backend/              # Node.js/TypeScript backend API
│   ├── src/             # Source code
│   ├── dist/            # Compiled JavaScript (generated)
│   ├── Dockerfile       # Backend container definition
│   ├── package.json     # Backend dependencies
│   └── tsconfig.json    # TypeScript configuration
├── frontend/            # React/TypeScript frontend
│   ├── src/            # Source code
│   ├── public/         # Static assets
│   ├── build/          # Production build (generated)
│   ├── Dockerfile      # Frontend container definition
│   ├── nginx.conf      # Nginx configuration
│   ├── package.json    # Frontend dependencies
│   └── tsconfig.json   # TypeScript configuration
├── shared/             # Shared TypeScript types
│   └── types/
│       └── index.ts    # Common type definitions
├── data/               # Persistent data storage
│   ├── sessions/       # Session data
│   ├── audit-logs/     # Audit logs
│   ├── prompts/        # Prompt templates
│   ├── audio/          # Temporary audio files
│   ├── analytics/      # Metrics data
│   ├── pii-mappings/   # PII anonymization
│   ├── decision-matrix/ # Decision rules
│   └── learning/       # AI learning data
└── docker-compose.yml  # Container orchestration

```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Quick Start with Docker

1. **Clone the repository**:
```bash
git clone <repository-url>
cd CatalAIst
```

2. **Build and start the containers**:
```bash
docker-compose up -d --build
```

3. **Access the application**:
- Frontend: http://localhost
- Backend API: http://localhost:8080
- Health check: http://localhost:8080/health

4. **Enter your OpenAI API key** when prompted in the web interface

5. **Start classifying!** Describe your business process and let the AI guide you through the classification.

For detailed deployment instructions, backup procedures, and troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

### First Time Setup

On first launch, the system will:
1. Create required data directories
2. Initialize default prompts for classification, clarification, and attribute extraction
3. Set up the audit logging system
4. Prepare the analytics engine

No additional configuration is required - just provide your OpenAI API key and start using the system!

### Local Development

For development without Docker:

1. Install backend dependencies:
```bash
cd backend
npm install
npm run dev
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
npm start
```

### Environment Variables

Backend environment variables:
- `PORT` - Server port (default: 8080)
- `DEFAULT_MODEL` - Default OpenAI model (default: gpt-4)
- `DEFAULT_VOICE` - Default TTS voice (default: alloy)
- `DATA_DIR` - Data directory path (default: /data)
- `LOG_LEVEL` - Logging level (default: info)
- `PII_ENCRYPTION_KEY` - Encryption key for PII mappings (auto-generated if not set)

Frontend environment variables:
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:8080)

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete environment variable documentation.

## Usage

### Classification Workflow

1. **Describe your process**: Enter a description of the business process you want to classify
2. **Answer clarification questions** (if needed): The AI may ask follow-up questions to better understand your process
3. **Review classification**: See the recommended transformation category with detailed rationale
4. **Provide feedback**: Confirm or correct the classification to help improve the system
5. **Rate the experience**: Give a thumbs up/down to help track user satisfaction

### Admin Features

Navigate to the admin sections using the top navigation bar:

- **Analytics**: View classification accuracy, user satisfaction rates, and performance metrics
- **Decision Matrix**: Configure business rules that influence classification decisions
- **AI Learning**: Review and approve AI-generated suggestions for system improvements
- **Prompts**: Edit system prompts for classification, clarification, and attribute extraction
- **Audit Trail**: View complete session history with all events and data transformations

## Data Persistence

All data is stored in the Docker volume `catalai-data` mounted at `/data` in the backend container.

**Data survives container restarts** - your sessions, audit logs, and configurations are preserved.

Directory structure:
- `/data/sessions` - Session data with conversation history
- `/data/audit-logs` - Audit logs in JSONL format (daily rotation)
- `/data/prompts` - Prompt templates with versioning
- `/data/audio` - Temporary audio files (auto-cleanup)
- `/data/analytics` - Aggregated metrics and dashboards
- `/data/pii-mappings` - PII anonymization mappings (encrypted)
- `/data/decision-matrix` - Decision matrix versions with full history
- `/data/learning` - AI learning analysis and suggestions

### Backup

To backup your data:
```bash
docker run --rm -v catalai-data:/data -v $(pwd):/backup alpine tar czf /backup/catalai-backup.tar.gz /data
```

To restore from backup:
```bash
docker run --rm -v catalai-data:/data -v $(pwd):/backup alpine tar xzf /backup/catalai-backup.tar.gz -C /
```

## API Documentation

The backend provides a RESTful API. Key endpoints:

- `POST /api/sessions` - Create a new session
- `POST /api/process/submit` - Submit a process for classification
- `POST /api/process/clarify` - Submit clarification answers
- `POST /api/feedback/classification` - Submit classification feedback
- `POST /api/feedback/rating` - Submit user rating
- `GET /api/analytics/dashboard` - Get analytics metrics
- `GET /api/audit/logs` - Get audit logs by date
- `GET /api/prompts` - List all prompts
- `GET /api/decision-matrix` - Get current decision matrix

For complete API documentation, see [backend/API-ENDPOINTS.md](backend/API-ENDPOINTS.md).

## Architecture

### Technology Stack

**Backend**:
- Node.js 20 with TypeScript
- Express.js for REST API
- OpenAI API for GPT models
- File-based storage (JSON/JSONL)

**Frontend**:
- React 18 with TypeScript
- Nginx for production serving
- Responsive design with inline styles

**Infrastructure**:
- Docker & Docker Compose
- Alpine Linux base images
- Health checks and auto-restart

### Design Principles

1. **Stateless backend**: All state stored in files, easy to scale horizontally
2. **Append-only audit logs**: JSONL format for reliable audit trail
3. **Version control**: All prompts and decision matrices are versioned
4. **PII protection**: Automatic detection and scrubbing with reversible mapping
5. **Confidence-based routing**: Different workflows based on AI confidence
6. **Feedback loop**: Continuous learning from user corrections

## Troubleshooting

### Common Issues

**Frontend shows blank screen**:
- Check browser console for errors
- Verify backend is running: `docker logs catalai-backend`
- Check nginx logs: `docker logs catalai-frontend`

**"OpenAI API key is required" error**:
- Ensure you entered a valid API key starting with `sk-`
- Check backend logs for API errors: `docker logs catalai-backend`

**No audit logs appearing**:
- Logs are created on first classification
- Check `/data/audit-logs` directory in backend container
- Verify date filter in Audit Trail page

**Data lost after restart**:
- Ensure you're using `docker-compose down` (not `docker-compose down -v`)
- Check volume exists: `docker volume ls | grep catalai`

For more troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Health Checks

Both containers include health check endpoints:
- Backend: `GET /health`
- Frontend: `GET /`

Health checks run every 30 seconds with a 10-second timeout.

## Version

**v1.0.0** - Initial Release

## License

See LICENSE file for details.
