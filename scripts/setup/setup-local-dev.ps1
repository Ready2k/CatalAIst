# Local Development Setup Script for Windows
# Sets up CatalAIst for local development with ports 4000 (backend) and 4001 (frontend)

Write-Host "🚀 CatalAIst Local Development Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path .env) {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating .env file from example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    
    Write-Host "🔐 Generating secure secrets..." -ForegroundColor Yellow
    # Note: Windows users should manually update secrets or install OpenSSL
    Write-Host "⚠️  Please update the following in .env with secure random values:" -ForegroundColor Yellow
    Write-Host "   - JWT_SECRET" -ForegroundColor Yellow
    Write-Host "   - PII_ENCRYPTION_KEY" -ForegroundColor Yellow
    Write-Host "   - CREDENTIALS_ENCRYPTION_KEY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   You can generate them with:" -ForegroundColor Yellow
    Write-Host "   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))" -ForegroundColor Gray
    Write-Host ""
}

# Check if frontend/.env.local exists
if (Test-Path frontend\.env.local) {
    Write-Host "✅ frontend\.env.local exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating frontend\.env.local..." -ForegroundColor Yellow
    @"
# Frontend Local Development Configuration

# Frontend port
PORT=4001

# Backend API URL
REACT_APP_API_URL=http://localhost:4000
"@ | Out-File -FilePath frontend\.env.local -Encoding UTF8
    Write-Host "✅ frontend\.env.local created" -ForegroundColor Green
}

# Verify port configuration
Write-Host ""
Write-Host "🔍 Verifying configuration..." -ForegroundColor Cyan
$backendPort = (Get-Content .env | Select-String "^PORT=").ToString().Split('=')[1]
$frontendPort = (Get-Content frontend\.env.local | Select-String "^PORT=").ToString().Split('=')[1]
$apiUrl = (Get-Content frontend\.env.local | Select-String "^REACT_APP_API_URL=").ToString().Split('=')[1]

Write-Host "   Backend port: $backendPort" -ForegroundColor White
Write-Host "   Frontend port: $frontendPort" -ForegroundColor White
Write-Host "   API URL: $apiUrl" -ForegroundColor White

if ($backendPort -ne "4000") {
    Write-Host "⚠️  Warning: Backend port is $backendPort, expected 4000" -ForegroundColor Yellow
}

if ($frontendPort -ne "4001") {
    Write-Host "⚠️  Warning: Frontend port is $frontendPort, expected 4001" -ForegroundColor Yellow
}

if ($apiUrl -ne "http://localhost:4000") {
    Write-Host "⚠️  Warning: API URL is $apiUrl, expected http://localhost:4000" -ForegroundColor Yellow
}

# Check if dependencies are installed
Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan

if (-not (Test-Path backend\node_modules)) {
    Write-Host "📥 Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
}

if (-not (Test-Path frontend\node_modules)) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
}

# Build backend
Write-Host ""
Write-Host "🔨 Building backend..." -ForegroundColor Cyan
Push-Location backend
npm run build
Pop-Location
Write-Host "✅ Backend built successfully" -ForegroundColor Green

# Create data directories
Write-Host ""
Write-Host "📁 Creating data directories..." -ForegroundColor Cyan
$dataDirs = @(
    "data\sessions",
    "data\audit-logs",
    "data\prompts",
    "data\audio",
    "data\audio\cache",
    "data\analytics",
    "data\pii-mappings",
    "data\decision-matrix",
    "data\learning",
    "data\users"
)

foreach ($dir in $dataDirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-Host "✅ Data directories created" -ForegroundColor Green

# Check if admin user exists
Write-Host ""
if (Test-Path data\users\users.json) {
    Write-Host "✅ Admin user already exists" -ForegroundColor Green
} else {
    Write-Host "👤 Admin user not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create an admin user:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run create-admin:dev" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create admin user (if not done):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run create-admin:dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start backend (Terminal 1):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start frontend (Terminal 2):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access application:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:4001" -ForegroundColor Gray
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor Gray
Write-Host "   Health:   http://localhost:4000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Cyan
