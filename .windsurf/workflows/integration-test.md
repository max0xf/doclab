---
description: Write and validate integration tests following TEST_GUIDELINE
---

# Integration Test Development Workflow

**Reference**: Read `src/backend/src/integration_tests/TEST_GUIDELINE.md` for detailed standards and patterns.

## Step 1: Prepare Environment

```bash
# Ensure backend server is running
curl http://localhost:8000/api/health || echo "⚠️  Start backend server first"

# Activate virtual environment
cd src/backend
source venv/bin/activate

# Verify configuration
grep -E "API_URL|API_TOKEN" ../../.env ../../.env.dev
```

## Step 2: Review Guideline and Existing Tests

```bash
# Read the guideline
cat src/backend/src/integration_tests/TEST_GUIDELINE.md

# Check existing tests for your API area
ls -la src/backend/src/integration_tests/test_*.py

# Review available helpers
grep "^def " src/backend/src/integration_tests/test_helpers.py
```

## Step 3: Identify Test Scope

**Answer these questions:**
- What API endpoint(s) am I testing?
- What scenarios need coverage?
- What are the gaps (untested scenarios)?
- Can I use an existing test file or need a new one?
- What prerequisite objects do I need? (check test_helpers.py)

## Step 4: Write Test Following Guideline Pattern

**Choose file:**
- Existing API area → Use existing `test_[feature]_api.py`
- New API area → Create new `test_[feature]_api.py` with required header

**Write test:**
- Follow the test pattern from TEST_GUIDELINE.md
- Use helpers from `test_helpers.py` for prerequisites
- Include proper header with "Tested Scenarios" and "Untested Scenarios / Gaps"
- Add comprehensive logging with ✓/✗/⚠️

**If you need a new helper:**
- Add to `test_helpers.py` (not in test file)
- Follow helper guidelines from TEST_GUIDELINE.md

## Step 5: Validate with Full Test Suite

**IMPORTANT**: Always use the test script - do NOT run pytest directly!

```bash
# Run ALL integration tests using the script
# This ensures proper environment setup and catches regressions
./scripts/run-backend-tests.sh
```

**Why use the script?**
- Ensures correct environment variables are loaded
- Checks database migrations
- Runs all tests to catch regressions
- Provides consistent test execution
- Validates that your changes don't break other tests

**DO NOT** run individual tests with pytest directly - always use the script!

## Step 6: Update Test File Header

**Ensure header includes:**
- All tested scenarios (including your new one)
- Updated gaps/untested scenarios
- Accurate test strategy statement

## Step 7: Final Validation - Run All Tests

**CRITICAL**: Always run the full test suite to ensure nothing is broken:

```bash
# Run all integration tests - this is the final validation
# DO NOT suppress output - you need to see the full results!
./scripts/run-backend-tests.sh
```

**IMPORTANT**: View the **FULL OUTPUT** - don't suppress or truncate it! You need to see:
- Which tests passed/failed
- Exact error messages and stack traces
- Line numbers where failures occurred
- HTTP status codes and API responses

**Expected output:**
```
=================== 75 passed, 2 skipped in 1.70s ===================
✅ All tests passed!
```

**If tests fail:**
1. **Read the full error output** - don't just look at the summary
2. Check the exact error message and stack trace
3. Look for:
   - Import errors → Use helpers from test_helpers.py
   - HTTP 404 errors → Check API endpoint paths
   - Type errors → Check function return types
   - Assertion errors → Check test expectations vs actual behavior
4. Fix the issues and run again until all tests pass

**Common import errors:**
- `cannot import name 'create_test_comment'` → Use `create_comment` from test_helpers.py
- `cannot import name 'create_test_user_change'` → Use `create_user_change` from test_helpers.py
- Missing helper → Check if it exists in test_helpers.py

**Common API errors:**
- `HTTP 404` → Wrong endpoint path (check urls.py for correct routes)
- `TypeError: 'bool' object is not subscriptable` → Helper returns wrong type (should return Dict, not bool)

## Validation Checklist

Before committing, verify:
- [ ] Test follows pattern from TEST_GUIDELINE.md
- [ ] Uses helpers from test_helpers.py for prerequisites
- [ ] Has cleanup in finally block
- [ ] Includes comprehensive logging
- [ ] Test file header lists all scenarios and gaps
- [ ] Test passes twice (idempotent)
- [ ] No test artifacts left in database
- [ ] **ALL integration tests pass** (`./scripts/run-backend-tests.sh`)

## Common Issues

Refer to "Quick Reference" section in TEST_GUIDELINE.md for troubleshooting.
