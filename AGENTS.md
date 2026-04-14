# Agent Skills for DocLab

## UI Linter Issues

When encountering linter/prettier errors in the frontend code:

1. **First**, run the auto-fix command:
   ```bash
   npm run lint:fix
   ```

2. This will automatically fix most formatting issues (prettier, eslint)

3. Only if issues persist after auto-fix, then manually address them

**Rationale**: The project has strict linting rules with no `eslint-disable` allowed. Auto-fix resolves 95% of formatting issues instantly, saving time and avoiding manual formatting errors.

## Commit Messages and Long Text in Commands

When creating commit messages or passing large chunks of text to shell commands:

1. **For commit messages**: Use multiple `-m` flags with simple, single-line messages instead of one long multi-line message
   ```bash
   # Good
   git commit -s -m 'feat: add feature' -m 'Description line 1' -m 'Description line 2'
   
   # Avoid - causes quote escaping issues
   git commit -s -m "feat: add feature

   Long multi-line description with special characters..."
   ```

2. **For very long text**: Create a temporary file and use input redirection
   ```bash
   # Create temp file with content
   cat > /tmp/commit-msg.txt << 'EOF'
   Your long commit message here
   EOF
   
   # Use the file
   git commit -s -F /tmp/commit-msg.txt
   ```

3. **Keep it simple**: Break complex messages into shorter, simpler parts

**Rationale**: Shell quote escaping is fragile and error-prone, especially with special characters, newlines, and apostrophes. Using multiple `-m` flags or temp files avoids quote-related failures entirely.

## API Token Creation and Testing

When you need to test API endpoints or create tokens for automation:

### Creating an API Token

1. **Login to the application**:
   - Default credentials: `admin` / `admin`
   - Navigate to Profile page (user menu → Profile Settings)

2. **Create a new token**:
   - Scroll to "API Tokens" section
   - Enter a token name (e.g., "CI", "Testing", "Automation")
   - Select expiration:
     - 1 Month (30 days)
     - 1 Year (365 days)
     - Custom (specify days)
   - Click "Create Token"

3. **Copy the token immediately**:
   - Token is shown only once after creation
   - Use the "Copy" button to copy to clipboard
   - Store securely - you won't be able to see it again

### Testing API with Token

The API token is stored in `.env` file for convenience:

```bash
# Load token from .env
source .env

# Example: Get user profile
curl -H "Authorization: Bearer $API_TOKEN" \
  $API_URL/api/user_management/v1/profile

# Example: List repositories
curl -H "Authorization: Bearer $API_TOKEN" \
  "$API_URL/api/git-provider/v1/repositories/repositories/?provider=bitbucket_server&page=1&per_page=10"

# Example: List service tokens
curl -H "Authorization: Bearer $API_TOKEN" \
  $API_URL/api/service-tokens/v1/tokens
```

Or use the token directly:

```bash
# Without .env file
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/user_management/v1/profile
```

**Note**: The `.env` file contains the API token for local development and testing. Keep this file secure and never commit it to version control (it's already in `.gitignore`).

**Rationale**: API tokens enable programmatic access for CI/CD, testing, and automation without exposing user passwords. Bearer token authentication is the standard for REST APIs and allows secure, revocable access.

## File Corruption and Fixes

When a file becomes corrupted or has errors after an edit:

1. **NEVER use git commands to revert**: Do NOT use `git checkout`, `git reset`, or `git revert` to fix files
2. **Always analyze and fix manually**: Read the file, understand the corruption, and fix it with proper edits
3. **Use read_file to understand**: Read the corrupted section and surrounding context
4. **Make targeted edits**: Use the edit tool to fix only the broken parts

**Example of WRONG approach**:
```bash
# ❌ NEVER DO THIS
git checkout src/frontend/components/MyFile.tsx
git reset HEAD src/frontend/components/MyFile.tsx
```

**Example of CORRECT approach**:
```
1. Read the file to see the corruption
2. Identify what's missing or broken
3. Use edit tool to fix the specific issue
4. Run linter to verify
```

**Rationale**: Using git commands to revert loses all the work done in the current session. It's better to understand what went wrong and fix it surgically. This also helps learn from mistakes and avoid repeating them.
