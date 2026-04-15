---
description: Write and validate unit tests following TEST_GUIDELINE
---

# Unit Test Development Workflow

**📖 Read First:** `src/backend/src/unit_tests/TEST_GUIDELINE.md` for complete standards and patterns.

## Step 1: Identify Test Type

Choose the appropriate category:

1. **Pure Unit Tests** - No database, use mocks (< 1s)
2. **Model Tests** - Test Django models with `@pytest.mark.django_db`
3. **Business Logic Tests** - Multi-model workflows with `@pytest.mark.django_db`

See TEST_GUIDELINE.md for detailed descriptions and examples.

## Step 2: Create Test File

**Location:** `src/backend/src/unit_tests/`  
**Naming:** `test_<app>_<feature>.py`  
**Examples:** `test_git_provider_bitbucket.py`, `test_wiki_file_mapping.py`

## Step 3: Write Test

**MUST use shared helpers from `test_helpers.py`:**
```python
from unit_tests.test_helpers import create_mock_response

# Use helper instead of creating Mock() manually
mock_response = create_mock_response(200, {'key': 'value'})
```

**Follow TEST_GUIDELINE.md for:**
- Required header format (Tested/Untested scenarios, Strategy)
- Available fixtures: `user`, `admin_user`, `another_user`, `space`, `request_factory`
- Available helpers: `create_mock_response`, `create_test_user`, `create_test_space`
- Common patterns (Model tests, Mock tests, Decorator tests)
- Best practices (descriptive names, mocks for external deps, fast tests)

## Step 4: Validate Helper Functions

**Check for common functions that should be in `test_helpers.py`:**

1. **Scan test file for helper functions:**
   - Functions that create mock objects (`Mock()`, mock responses, mock users)
   - Functions used for setup/teardown
   - Common assertion patterns
   - Any function that could be reused

2. **Extract to `test_helpers.py` if:**
   - Function is used in 2+ test files
   - Function creates mock objects (use `create_mock_response()`, `create_mock_user()`)
   - Function has complex setup logic
   - Function is a common assertion pattern

3. **Update imports:**
   ```python
   from unit_tests.test_helpers import create_mock_response, create_mock_user
   ```

**❌ Anti-patterns to fix:**
- `Mock()` for HTTP responses → use `create_mock_response()`
- `Mock()` for user objects → use `create_mock_user()`
- Duplicated helper functions across files → extract to `test_helpers.py`

## Step 5: Run Tests

**Always use the script to validate changes:**

```bash
# From repo root
./scripts/run-unit-tests.sh

# Or from backend directory
cd src/backend
./scripts/run-unit-tests.sh
```

**Expected:** All tests pass in < 5 seconds

**If tests fail:** See Troubleshooting section in TEST_GUIDELINE.md

## Quality Checklist

Before committing:
- [ ] Comprehensive header (Tested/Untested scenarios, Strategy)
- [ ] Uses shared fixtures and helpers
- [ ] No inline `Mock()` - uses `create_mock_response()` or `create_mock_user()`
- [ ] No duplicated helper functions - extracted to `test_helpers.py`
- [ ] Descriptive test names
- [ ] Correct use of `@pytest.mark.django_db`
- [ ] Tests are fast (< 5s each)
- [ ] All tests pass: `./scripts/run-unit-tests.sh`

See TEST_GUIDELINE.md Quality Checklist for complete list.

---

## Quick Reference

**Guideline:** `src/backend/src/unit_tests/TEST_GUIDELINE.md`  
**Examples:** `test_git_provider_bitbucket.py`, `test_wiki_file_mapping.py`, `test_users_cache_decorator.py`  
**Validate:** `./scripts/run-unit-tests.sh`
