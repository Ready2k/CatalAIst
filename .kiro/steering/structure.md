# CatalAIst Project Structure

## Root Directory Layout
```
CatalAIst/
├── backend/           # Node.js/Express API server
├── frontend/          # React application
├── shared/            # Shared TypeScript types
├── docs/              # Comprehensive documentation
├── scripts/           # Utility and setup scripts
├── Logs/              # Development and deployment logs
├── tasks/             # YAML task definitions
├── catalai.sh         # Main management script
├── docker-compose.yml # Container orchestration
└── .env               # Environment configuration
```

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── startup.ts            # Application initialization
│   ├── middleware/           # Express middleware (auth, etc.)
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic services
│   │   ├── analytics.service.ts
│   │   ├── bedrock.service.ts
│   │   ├── classification.service.ts
│   │   ├── clarification.service.ts
│   │   ├── decision-matrix.service.ts
│   │   ├── learning-*.service.ts
│   │   ├── llm.service.ts
│   │   ├── openai.service.ts
│   │   ├── pii-*.service.ts
│   │   ├── user.service.ts
│   │   └── voice/            # Voice service providers
│   ├── scripts/              # Utility scripts (create-admin)
│   └── types/                # Backend-specific types
├── data/                     # File-based data storage
│   ├── analytics/
│   ├── audio/cache/
│   ├── audit-logs/
│   ├── decision-matrix/
│   ├── learning/
│   ├── pii-mappings/
│   ├── prompts/              # LLM prompt templates
│   ├── sessions/
│   └── users/
├── dist/                     # Compiled TypeScript output
├── docs/                     # Backend-specific documentation
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── App.tsx               # Main React application
│   ├── index.tsx             # Application entry point
│   ├── components/           # React components
│   │   ├── AdminReview.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ClassificationResult.tsx
│   │   ├── DecisionMatrixFlowEditor.tsx
│   │   ├── Login.tsx
│   │   ├── UserManagement.tsx
│   │   ├── VoiceRecorder.tsx
│   │   ├── decision-matrix-flow/  # Flow diagram components
│   │   │   ├── nodes/
│   │   │   ├── edges/
│   │   │   ├── panels/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   └── voice/            # Voice interface components
│   │       ├── AudioPlayer.tsx
│   │       ├── AudioRecorder.tsx
│   │       ├── StreamingModeController.tsx
│   │       └── utils/
│   └── services/             # API client services
│       ├── api.ts
│       └── nova-sonic-websocket.service.ts
├── public/
├── build/                    # Production build output
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Shared Types (`shared/`)
```
shared/
├── types/
│   ├── index.ts              # Main type definitions
│   ├── validation.ts         # Zod validation schemas
│   └── voice.types.ts        # Voice-specific types
├── dist/                     # Compiled shared types
├── package.json
└── tsconfig.json
```

## Documentation Structure (`docs/`)
```
docs/
├── README.md                 # Documentation index
├── setup/                    # Setup and configuration guides
├── deployment/               # Production deployment guides
├── security/                 # Security configuration and audits
├── releases/                 # Release notes and changelogs
├── fixes/                    # Bug fixes and improvements
├── features/                 # Feature documentation
├── guides/                   # Best practices and how-to guides
├── architecture/             # Technical architecture docs
└── troubleshooting/          # Common issues and solutions
```

## Key Conventions

### File Naming
- **Services**: `*.service.ts` for business logic
- **Components**: PascalCase React components (e.g., `ChatInterface.tsx`)
- **Types**: `*.types.ts` for type definitions
- **Tests**: `*.test.ts` in `__tests__/` directories
- **Configuration**: Lowercase with hyphens (e.g., `docker-compose.yml`)

### Directory Organization
- **Services**: Grouped by functionality in `backend/src/services/`
- **Components**: Flat structure in `frontend/src/components/` with subdirectories for complex features
- **Types**: Centralized in `shared/types/` for cross-project usage
- **Data**: File-based storage organized by data type in `backend/data/`

### Import Patterns
- **Shared Types**: Import from `shared/types` package
- **Services**: Use dependency injection pattern
- **Components**: Functional components with hooks
- **API**: RESTful endpoints with consistent naming

### Code Organization
- **Backend**: Service-oriented architecture with clear separation of concerns
- **Frontend**: Component-based architecture with reusable UI elements
- **Shared**: Type-safe interfaces with Zod validation schemas
- **Configuration**: Environment-based configuration with secure defaults

### Data Storage
- **Sessions**: JSON files in `backend/data/sessions/`
- **Users**: JSON files in `backend/data/users/` with encrypted credentials
- **Analytics**: Aggregated data in `backend/data/analytics/`
- **Audit Logs**: Timestamped entries in `backend/data/audit-logs/`
- **Prompts**: Versioned prompt templates in `backend/data/prompts/`

### Security Patterns
- **Authentication**: JWT tokens with role-based access control
- **Encryption**: AES-256-GCM for PII and credentials
- **Validation**: Zod schemas for all API inputs
- **Rate Limiting**: Tiered limits based on endpoint sensitivity