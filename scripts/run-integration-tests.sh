#!/bin/bash
# Shortcut to run backend integration tests
# This script delegates to the main script in src/backend/scripts/

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔗 Running backend integration tests..."
echo ""

exec "$REPO_ROOT/src/backend/scripts/run-integration-tests.sh" "$@"
