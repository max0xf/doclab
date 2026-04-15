#!/bin/bash
# Shortcut to run backend unit tests
# This script delegates to the main script in src/backend/scripts/

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔗 Running backend unit tests..."
echo ""

exec "$REPO_ROOT/src/backend/scripts/run-unit-tests.sh" "$@"
