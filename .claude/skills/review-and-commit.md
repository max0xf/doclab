---
description: Review code changes and create commit following cyber-wiki standards
---

# Review & Commit Skill

This skill reviews changed code for quality, security, and compliance, then creates a commit if all checks pass.

## When to Use This Skill

Use this skill when you need to:

- Review staged or unstaged changes before committing
- Ensure code follows project standards (docs/shared/CODING_GUIDELINES.md)
- Validate commit size, tests, linting, and type checking
- Create properly formatted commit messages with JIRA ticket references
- Handle OpenSpec change status and archiving decisions

## Usage

Invoke this skill when:

- User asks to "commit changes"
- User asks to "review and commit"
- User provides a JIRA ticket and wants to create a commit
- You've completed implementation and need to commit

## Workflow

### Phase 0: Detect Changes

Automatically detect all changed files:

```bash
git status
git diff --cached --stat
```

### Phase 1: Code Review

Review all changed files against project standards:

**Required Checks:**

- ✅ No hardcoded colors (must use CSS variables from `@acronis-platform/ui-syntax`)
- ✅ No hardcoded fonts (must use font variables)
- ✅ Exact package versions (no `^` or `~` in package.json)
- ✅ Single assertion per test
- ✅ Test files mirror source paths under `src/tests/unit/`
- ✅ No unused code
- ✅ No security vulnerabilities

**Run Quality Checks:**

```bash
npm run lint -- --fix
npm run type-check
npm run test
npm run knip
```

**Validate Commit Size:**

- Maximum: 4000 LOC per commit
- Check: `git diff --cached --shortstat`
- If exceeded: Split into smaller commits

### Phase 2: OpenSpec Change Status

Check if there's an active OpenSpec change:

```bash
ls openspec/changes/ | grep -v archive
```

**If change exists and relates to commit:**

1. Read `openspec/changes/<change-id>/tasks.md`
2. Count completed vs total tasks
3. If all tasks complete: Note that archiving is needed AFTER deployment
4. If tasks incomplete: Mark commit as `[WIP]` and include `OpenSpec: <change-id>`

**IMPORTANT:** Do NOT archive before deployment. Archiving happens in a separate PR after deploy.

### Phase 3: Prepare Commit Message

**Standard Format:**

```
[TYPE] [TICKET-ID] Brief description (max 50 chars)

Detailed explanation:
- Bullet point 1
- Bullet point 2

Fixes: TICKET-ID

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**WIP Format (if OpenSpec tasks incomplete):**

```
[WIP] [TYPE] [TICKET-ID] Brief description

Detailed explanation:
- Bullet point 1

Related: TICKET-ID
OpenSpec: <change-id>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Commit Types:**

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Test changes
- `docs` - Documentation only
- `style` - Formatting, missing semi-colons, etc.
- `chore` - Maintenance tasks
- `perf` - Performance improvements

### Phase 4: Create Commit

**CRITICAL RULES:**

- ⛔ **NEVER use `--no-verify`** - Pre-commit hooks MUST run
- ⛔ **NEVER use `-n` flag** - This bypasses hooks
- ✅ Always let pre-commit hooks run

```bash
git commit -m "$(cat <<'EOF'
[TYPE] [TICKET-ID] Description

Details here

Fixes: TICKET-ID

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**If hooks fail:**

1. Read error message
2. Fix issues (run `npm run lint -- --fix`, etc.)
3. Stage fixed files
4. Retry commit (do NOT use `--no-verify`)

### Phase 5: Verify Commit

```bash
git log --oneline -n 1
git show HEAD --stat
```

**Check:**

- ✅ Commit message is correct
- ✅ All intended files included
- ✅ No accidental files
- ✅ Commit size reasonable

## Common Issues & Fixes

### Commit Size Exceeds Limit

```bash
git reset --soft HEAD~1
git add [subset-of-files]
git commit -m "[TYPE] [TICKET-ID] Part 1: Description"
```

### Tests Failing

```bash
npm run test
# Fix failing tests
git add [fixed-files]
git commit --amend --no-edit
```

### Wrong Node.js Version

```bash
nvm use
# Re-run failed command
```

### Hardcoded Colors Found

```tsx
// ❌ Wrong
<Line stroke="#3b82f6" />

// ✅ Correct
<Line stroke="var(--acv-color-chart-blue)" />
```

## References

- **Coding Guidelines:** `docs/shared/docs/shared/CODING_GUIDELINES.md`
- **Project Documentation:** `openspec/project.md`
- **Full Workflow:** `.windsurf/workflows/review-and-commit.md`

## Key Rules Summary

1. ⛔ **NEVER `--no-verify`** - Pre-commit hooks MUST run
2. 📏 **Max 4000 LOC** - Break large changes into smaller commits
3. ✅ **All tests pass** - Run `npm run test` before commit
4. 📝 **Clear messages** - Include JIRA ticket reference
5. 🔍 **No secrets** - Check for hardcoded credentials
6. 🎯 **Logical grouping** - Related changes in same commit
7. 📋 **Follow format** - Use `[TYPE] [TICKET-ID] Description`
8. 🎨 **Use CSS variables** - No hardcoded hex colors
9. 📦 **Exact versions** - No `^` or `~` in package.json
10. 🔧 **Use nvm** - Always run `nvm use` before tests/lint
11. ⛔ **NEVER commit `openspec/changes/`** - These are working artifacts only
