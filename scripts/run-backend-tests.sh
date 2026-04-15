#!/bin/bash
# Shortcut to run all backend tests (integration + unit)
# This script delegates to the main script in src/backend/scripts/

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔗 Running all backend tests..."
echo ""

exec "$REPO_ROOT/src/backend/scripts/run-backend-tests.sh" "$@"
