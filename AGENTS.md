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
