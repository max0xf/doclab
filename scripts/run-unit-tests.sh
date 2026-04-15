#!/usr/bin/env bash
set -e

# Run backend unit tests
# Unit tests are fast, isolated tests that don't require external services

# Always resolve paths relative to the repo root
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/src/backend"

echo "=== Backend Unit Tests ==="
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

# Set Django settings for unit tests
export DJANGO_SETTINGS_MODULE=config.settings
export DJANGO_SECRET_KEY="unit-test-secret-key"

# Parse command line arguments
TEST_PATH="src/"
PYTEST_ARGS="-v -rs"
EXCLUDE_INTEGRATION="--ignore=src/integration_tests"

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
        --git-provider)
            TEST_PATH="src/git_provider/tests/"
            EXCLUDE_INTEGRATION=""
            shift
            ;;
        --users)
            TEST_PATH="src/users/tests/"
            EXCLUDE_INTEGRATION=""
            shift
            ;;
        --wiki)
            TEST_PATH="src/wiki/tests/"
            EXCLUDE_INTEGRATION=""
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fast           Run tests in parallel"
            echo "  --coverage       Generate coverage report"
            echo "  --git-provider   Run only git provider unit tests"
            echo "  --users          Run only users unit tests"
            echo "  --wiki           Run only wiki unit tests"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  # Run all unit tests"
            echo "  $0 --fast           # Run tests in parallel"
            echo "  $0 --coverage       # Run with coverage report"
            echo "  $0 --git-provider   # Run only git provider tests"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo ""
echo "🧪 Running unit tests..."
echo "   Test path: $TEST_PATH"
echo "   Pytest args: $PYTEST_ARGS $EXCLUDE_INTEGRATION"
echo ""

# Run tests
pytest $TEST_PATH $PYTEST_ARGS $EXCLUDE_INTEGRATION

# Check exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All unit tests passed!"
else
    echo "❌ Some unit tests failed (exit code: $EXIT_CODE)"
fi

exit $EXIT_CODE
