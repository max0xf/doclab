#!/usr/bin/env bash
set -e

# Setup development environment for doclab

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "🚀 Setting up DocLab development environment..."
echo ""

# 1. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js first."
    exit 1
fi

npm install
echo "✅ Frontend dependencies installed"
echo ""

# 2. Setup backend
echo "🐍 Setting up backend..."
BACKEND_DIR="src/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found at $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ python3 not found. Please install Python 3.9+ first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env.dev if it doesn't exist
if [ ! -f "../../.env.dev" ]; then
    echo "Creating .env.dev file..."
    cat > ../../.env.dev << 'EOF'
# Django settings
DJANGO_SECRET_KEY=dev-local-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Encryption key for service tokens (32 chars minimum)
ENCRYPTION_KEY=dev-encryption-key-change-this-in-production-min-32-chars

# Database (optional - defaults to SQLite)
# DATABASE_URL=postgresql://user:password@localhost:5432/doclab
EOF
    echo "✅ Created .env.dev"
fi

# Run migrations
echo "Running database migrations..."
python3 manage.py migrate

# Create superuser
echo "Creating admin user..."
python3 manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print('✅ Created admin user (username: admin, password: admin)')
else:
    print('ℹ️  Admin user already exists')
"

cd "$REPO_ROOT"

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "To start the application:"
echo "  ./scripts/run-local.sh"
echo ""
echo "Or start services separately:"
echo "  Backend:  cd src/backend && source venv/bin/activate && python3 manage.py runserver"
echo "  Frontend: npm start"
echo ""
echo "Default admin credentials:"
echo "  Username: admin"
echo "  Password: admin"
echo ""
