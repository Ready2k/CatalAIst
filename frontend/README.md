# CatalAIst Frontend

React-based frontend application for the CatalAIst transformation classifier.

## Features

### User Features
- **API Key Input**: Secure session-based API key management
- **Process Description**: Text and voice input for describing business processes
- **Clarification Loop**: Interactive Q&A for improved classification accuracy
- **Classification Results**: Detailed results with confidence scores and rationale
- **Feedback System**: Confirm/correct classifications and provide ratings
- **Voice Interface**: Speech-to-text input and text-to-speech output

### Admin Features
- **Analytics Dashboard**: View system performance metrics and agreement rates
- **Decision Matrix Management**: Configure and version business rules
- **AI Learning Interface**: Review and approve AI-generated improvement suggestions
- **Prompt Management**: Edit and version classification prompts

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend API running (default: http://localhost:8080)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:8080
```

## Application Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ApiKeyInput.tsx           # API key entry
│   │   ├── ChatInterface.tsx         # Process description input
│   │   ├── VoiceRecorder.tsx         # Voice recording
│   │   ├── VoicePlayer.tsx           # Audio playback
│   │   ├── ClarificationQuestions.tsx # Q&A interface
│   │   ├── ClassificationResult.tsx   # Results display
│   │   ├── FeedbackCapture.tsx       # Feedback forms
│   │   ├── AnalyticsDashboard.tsx    # Metrics dashboard
│   │   ├── DecisionMatrixAdmin.tsx   # Rule management
│   │   ├── LearningAdmin.tsx         # AI suggestions
│   │   └── PromptAdmin.tsx           # Prompt editor
│   ├── services/
│   │   └── api.ts           # Backend API client
│   ├── App.tsx              # Main application
│   ├── index.tsx            # Entry point
│   └── index.css            # Global styles
├── public/
│   └── index.html
└── package.json
```

## Usage

### Classification Workflow

1. **Enter API Key**: Provide your OpenAI API key to start a session
2. **Describe Process**: Type or speak your process description
3. **Answer Questions**: Respond to clarification questions if needed
4. **Review Results**: See the classification with rationale
5. **Provide Feedback**: Confirm or correct the classification
6. **Rate Experience**: Give thumbs up/down with optional comments

### Admin Functions

Navigate using the top menu bar:

- **Classifier**: Main classification interface
- **Analytics**: View performance metrics
- **Decision Matrix**: Manage business rules
- **AI Learning**: Review improvement suggestions
- **Prompts**: Edit classification prompts

## API Integration

The frontend communicates with the backend via REST API. See `src/services/api.ts` for available endpoints.

Key endpoints:
- `POST /api/sessions` - Create session
- `POST /api/process/submit` - Submit process description
- `POST /api/sessions/:id/conversations` - Add conversation
- `POST /api/feedback/classification` - Submit feedback
- `POST /api/feedback/rating` - Submit rating
- `GET /api/analytics/dashboard` - Get metrics
- `GET /api/decision-matrix` - Get decision matrix
- `GET /api/learning/suggestions` - Get AI suggestions
- `GET /api/prompts` - Get prompts

## Voice Features

The voice interface requires:
- Microphone access for recording
- OpenAI API key with Whisper and TTS access
- Modern browser with MediaRecorder API support

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Security

- API keys are stored in memory only during the session
- No sensitive data is persisted in browser storage
- All API communication should use HTTPS in production

## Docker Deployment

The frontend is containerized with nginx:

```bash
docker build -t catalai-frontend .
docker run -p 80:80 catalai-frontend
```

See `Dockerfile` and `nginx.conf` for configuration.
