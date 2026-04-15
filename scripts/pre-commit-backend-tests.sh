#!/bin/bash

# Shortcut to run backend pre-commit tests from repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

exec "$REPO_ROOT/src/backend/scripts/pre-commit-tests.sh"
