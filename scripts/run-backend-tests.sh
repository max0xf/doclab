#!/usr/bin/env bash
set -e

# Run backend integration tests with proper environment setup
# This script handles venv activation, configuration loading, and test execution

# Always resolve paths relative to the repo root
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/src/backend"

echo "=== Backend Integration Tests ==="
echo ""

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Backend directory not found at $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found at $BACKEND_DIR/venv"
    echo "Please create it first:"
    echo "  cd $BACKEND_DIR"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt -r requirements-dev.txt"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Verify pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "❌ pytest not found in virtual environment"
    echo "Installing dependencies..."
    pip install -r requirements-dev.txt
fi

# Load configuration from .env files
# Load all files and merge them (later files override earlier ones)
echo "📋 Loading configuration..."
CONFIG_LOADED=false

# Load .env.test first (lowest priority)
if [ -f "src/integration_tests/.env.test" ]; then
    export $(cat src/integration_tests/.env.test | grep -v '^#' | xargs 2>/dev/null || true)
    echo "   ✓ Loaded from .env.test"
    CONFIG_LOADED=true
fi

# Load .env (medium priority)
if [ -f "$REPO_ROOT/.env" ]; then
    set -a
    source "$REPO_ROOT/.env"
    set +a
    echo "   ✓ Loaded from .env"
    CONFIG_LOADED=true
fi

# Load .env.dev last (highest priority)
if [ -f "$REPO_ROOT/.env.dev" ]; then
    set -a
    source "$REPO_ROOT/.env.dev"
    set +a
    echo "   ✓ Loaded from .env.dev"
    CONFIG_LOADED=true
fi

if [ "$CONFIG_LOADED" = false ]; then
    echo "⚠️  No configuration file found (.env.dev, .env, or .env.test)"
fi

# Set defaults
if [ -z "$DJANGO_SECRET_KEY" ]; then
    export DJANGO_SECRET_KEY="dev-local-secret-key-change-in-staging"
fi

# Check if API_TOKEN is set
if [ -z "$API_TOKEN" ] || [ "$API_TOKEN" = "your-api-token-here" ]; then
    echo ""
    echo "⚠️  API_TOKEN not configured"
    echo ""
    echo "To create an API token:"
    echo "  1. Start server: ./scripts/run-local.sh"
    echo "  2. Login at http://localhost:8000/admin (admin/admin)"
    echo "  3. Go to Profile → API Tokens"
    echo "  4. Create token and add to .env:"
    echo "     echo 'API_TOKEN=your-token-here' >> .env"
    echo ""
    exit 1
fi

echo "   ✓ API URL: ${API_URL:-http://localhost:8000}"
echo "   ✓ API Token: ${API_TOKEN:0:10}..."
echo ""

# Parse command line arguments
TEST_PATH="src/integration_tests/"
PYTEST_ARGS="-v -rs"

while [[ $# -gt 0 ]]; do
    case $1 in
        --fast)
            PYTEST_ARGS="$PYTEST_ARGS -n auto"
            shift
            ;;
        --coverage)
            PYTEST_ARGS="$PYTEST_ARGS --cov=src --cov-report=html --cov-report=term-missing"
            shift
            ;;
        --no-git)
            PYTEST_ARGS="$PYTEST_ARGS -m 'not git_provider'"
            shift
            ;;
        --auth-only)
            TEST_PATH="src/integration_tests/test_auth_api.py"
            shift
            ;;
        --git-only)
            TEST_PATH="src/integration_tests/test_git_provider_api.py"
            shift
            ;;
        --wiki-only)
            TEST_PATH="src/integration_tests/test_wiki_api.py"
            shift
            ;;
        --tokens-only)
            TEST_PATH="src/integration_tests/test_service_tokens_api.py"
            shift
            ;;
        --preferences-only)
            TEST_PATH="src/integration_tests/test_user_preferences_api.py"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fast              Run tests in parallel"
            echo "  --coverage          Generate coverage report"
            echo "  --no-git            Skip git provider tests"
            echo "  --auth-only         Run only authentication tests"
            echo "  --git-only          Run only git provider tests"
            echo "  --wiki-only         Run only wiki/space tests"
            echo "  --tokens-only       Run only service token tests"
            echo "  --preferences-only  Run only user preferences tests"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  # Run all integration tests"
            echo "  $0 --fast           # Run tests in parallel"
            echo "  $0 --coverage       # Run with coverage report"
            echo "  $0 --auth-only      # Run only auth tests"
            echo "  $0 --preferences-only # Run only preferences tests"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if migrations are up to date
echo "🔍 Checking migrations..."
if python manage.py migrate --check --noinput 2>/dev/null; then
    echo "   ✓ Migrations up to date"
else
    echo "⚠️  Migrations need to be applied (run 'python manage.py migrate')"
fi

echo ""
echo "🧪 Running integration tests..."
echo "   Test path: $TEST_PATH"
echo "   Pytest args: $PYTEST_ARGS"
echo ""

# Run tests
pytest $TEST_PATH $PYTEST_ARGS

# Check exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed (exit code: $EXIT_CODE)"
fi

exit $EXIT_CODE
