#!/usr/bin/env bash
set -e

# Run all backend tests (unit + integration)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Running All Backend Tests                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Track overall status
UNIT_FAILED=0
INTEGRATION_FAILED=0

# Run unit tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PHASE 1: Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if "$REPO_ROOT/scripts/run-unit-tests.sh" "$@"; then
    echo ""
    echo "✅ Unit tests passed"
else
    UNIT_FAILED=1
    echo ""
    echo "❌ Unit tests failed"
fi

echo ""
echo ""

# Run integration tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PHASE 2: Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if "$REPO_ROOT/scripts/run-backend-tests.sh" "$@"; then
    echo ""
    echo "✅ Integration tests passed"
else
    INTEGRATION_FAILED=1
    echo ""
    echo "❌ Integration tests failed"
fi

echo ""
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      Test Summary                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ $UNIT_FAILED -eq 0 ]; then
    echo "  ✅ Unit Tests:        PASSED"
else
    echo "  ❌ Unit Tests:        FAILED"
fi

if [ $INTEGRATION_FAILED -eq 0 ]; then
    echo "  ✅ Integration Tests: PASSED"
else
    echo "  ❌ Integration Tests: FAILED"
fi

echo ""

# Exit with error if any tests failed
if [ $UNIT_FAILED -ne 0 ] || [ $INTEGRATION_FAILED -ne 0 ]; then
    echo "❌ Some tests failed"
    exit 1
else
    echo "✅ All tests passed!"
    exit 0
fi
