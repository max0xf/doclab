#!/usr/bin/env bash
set -e

# Run frontend and backend locally for development

# Always resolve paths relative to the repo root, regardless of where the script is called from
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "Starting doclab locally..."

# Load .env.dev if present
if [ -f ".env.dev" ]; then
  set -a
  # shellcheck source=.env.dev
  source .env.dev
  set +a
fi

# Ensure DJANGO_SECRET_KEY is set (use from .env.dev or set a default)
if [ -z "$DJANGO_SECRET_KEY" ]; then
  export DJANGO_SECRET_KEY="dev-local-secret-key-change-in-staging"
  echo "Warning: DJANGO_SECRET_KEY not found in .env.dev, using default"
else
  export DJANGO_SECRET_KEY
fi

# Set environment variables
export REACT_APP_AUTH_API_URL=http://localhost:8000
export REACT_APP_VERSION=$(cat VERSION)
export REACT_APP_BUILD_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")

# Check if backend repository exists
BACKEND_DIR="src/backend"
if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ Backend repository not found at $BACKEND_DIR"
  echo "Run ./scripts/setup-workspace.sh to clone it"
  exit 1
fi

# Start backend in background
echo "Starting backend on :8000..."
(
  cd "$BACKEND_DIR"
  if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
  fi
  python3 manage.py migrate --noinput
  python3 manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print('Created default admin user (admin/admin)')
else:
    print('Admin user already exists')
"
  python3 manage.py runserver 0.0.0.0:8000
) &

BACKEND_PID=$!

cleanup() {
  echo "Stopping backend (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Start frontend
echo "Starting frontend on :3000..."
npm start
