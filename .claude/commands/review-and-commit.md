---
name: review-and-commit
description: Review code changes and create commit following cyber-wiki standards
---

# Review & Commit Workflow

## Overview

This workflow reviews changed code for quality, security, and compliance, then creates a commit if all checks pass.

**Detailed review criteria are defined in:**

- `docs/shared/docs/shared/CODING_GUIDELINES.md` - Coding standards and best practices
- `openspec/project.md` - Project architecture and OpenSpec workflow

## Phase 0: Automatic File Detection & Analysis

The agent automatically detects all changed files and begins review immediately:

```bash
git status
git diff --name-only
git diff --stat
```

**Automatic Agent Actions (No User Input Required):**

1. **Detect all changed files** - Identify .ts, .tsx, .py, .js, and other modified files
2. **Read full content** - Load complete content of each changed file
3. **Determine file types** - Categorize by extension and purpose
4. **Apply matching rules** - Automatically select applicable rules:
   - `.tsx` files → TypeScript rules + React Testing Library best practices
   - `.ts` files → TypeScript rules + type safety rules
   - `.py` files → Python/Django rules + server-side logic
   - Test files (`*.test.ts`, `*.test.tsx`) → Testing rules from docs/shared/CODING_GUIDELINES.md
   - All files → Color/typography rules, dependency management rules

5. **Scan all files** - Check each file against all applicable rules
6. **Collect findings** - Document all critical, high, and medium priority issues
7. **Begin Phase 1** - Automatically proceed to comprehensive code review

## Phase 1: Code Review of Changes

Agent performs comprehensive code review by applying rules to each file:

### Automatic Rule Application

For each changed file, the agent:

1. **Reads the full file content**
2. **Identifies file type and purpose**
3. **Applies matching rule sets** from `docs/shared/docs/shared/CODING_GUIDELINES.md`
4. **Checks for violations** against:
   - **Color usage** - No hardcoded hex colors, must use `var(--acv-color-*)` CSS variables
   - **Typography** - Must use `var(--acv-base-font-*)` CSS variables
   - **Dependency versions** - No `^` or `~` in package.json, exact versions only
   - **Type safety** - Use enums instead of union types for string literals
   - **Testing rules** - Single assertion per test, proper test location/naming
   - **Coverage baseline** - No coverage regressions below baseline
   - **Commit size** - Maximum 4000 LOC per commit

5. **Categorizes findings**:
   - 🚨 **Critical Issues** - Must fix before commit
   - ⚠️ **High Priority Issues** - Should fix before commit
   - 💡 **Medium Priority Issues** - Nice to fix

### Agent Review Output

The agent provides:

```markdown
## Automatic Code Review Results

### File: [filename]
**Type:** [.ts/.tsx/.py/.js]
**Rules Applied:** [list of applicable rules]

#### Critical Issues Found: [count]
[Detailed findings with line numbers and fix suggestions]

#### High Priority Issues Found: [count]
[Detailed findings with line numbers and fix suggestions]

#### Medium Priority Issues Found: [count]
[Detailed findings with line numbers and fix suggestions]

#### Positive Findings
[Well-written code, good patterns, etc.]
```

**Action:**

- ✅ If no critical/high priority issues: Proceed to Phase 2
- ❌ If issues found: Agent suggests fixes, user implements, re-run workflow

### Step 2: Validate Code Quality

Run automated checks:

```bash
nvm use
npm run lint -- --fix
npm run type-check
npm run test
npm run knip
```

**Required Checks:**

- [ ] Node.js version is correct (via `nvm use`)
- [ ] ESLint passes (no linting errors)
- [ ] TypeScript compiles (no type errors)
- [ ] All tests pass
- [ ] No unused code detected by Knip
- [ ] No console.log or debugger statements
- [ ] No hardcoded secrets or credentials

**Action:**

- ✅ If all checks pass: Proceed to Step 3
- ❌ If checks fail: Fix issues and re-run

### Step 3: Validate Commit Size

Check total lines of code:

```bash
git diff --stat | tail -1
```

**Rules:** See `docs/shared/docs/shared/CODING_GUIDELINES.md` - "Commit Size Rules"

- Maximum: **4000 LOC** per commit
- Count: additions + deletions
- Exclude: generated files, lock files, auto-formatted code

**Action:**

- ✅ If ≤ 4000 LOC: Proceed to Phase 2
- ❌ If > 4000 LOC: Split into smaller commits

### Step 4: Update Coverage Configuration (Test-Related Changes Only)

If the commit includes test changes, update coverage configuration and baseline:

**Step 4.1: Update jest.config.js thresholds**

When adding tests, update coverage thresholds in `jest.config.js` to lock in improvements and prevent regressions.

**Checklist:**

- [ ] Run `npm run test:coverage` to see current coverage metrics
- [ ] Review which files/directories have new tests
- [ ] Update coverage thresholds in `jest.config.js` based on actual coverage output
- [ ] Set thresholds to match or slightly below actual coverage (to allow small variations)
- [ ] Stage `jest.config.js` if modified

**Step 4.2: Verify coverage thresholds**

```bash
npm run test:coverage
```

**When to verify:**

- [ ] New test files added
- [ ] Existing tests modified
- [ ] Coverage thresholds changed in `jest.config.js`

**Action:**

- ✅ If test-related: Update jest.config.js thresholds if needed, stage the file
- ✅ If not test-related: Skip this step and proceed to Phase 2

## Phase 1.5: External AI Review (Optional)

After the agent's own code review, check if an external AI reviewer CLI is available and use it for a second opinion. Tries `codex` first, falls back to `claude`.

### Step 1: Detect Available Reviewer

```bash
which codex 2>/dev/null || which claude 2>/dev/null
```

**Decision tree:**

- **`codex` found** → Use Codex as reviewer (Step 2a)
- **`codex` NOT found, `claude` found** → Use Claude as reviewer (Step 2b)
- **Neither found** → Skip this phase, proceed to Phase 2

### Step 2a: Run Codex Review

```bash
codex review --uncommitted "Review for: code quality, type safety, security issues, hardcoded values, unused imports, naming conventions. Follow project rules: no hardcoded hex colors (use CSS variables), exact dependency versions only, enums instead of union types."
```

### Step 2b: Run Claude Review (Fallback)

```bash
git diff | claude -p "You are a code reviewer for a TypeScript/React project. Review this diff for: code quality, type safety, security issues, hardcoded values, unused imports, naming conventions. Project rules: no hardcoded hex colors (use CSS var(--acv-color-*) variables), exact dependency versions only (no ^ or ~), enums instead of union types for string literals. Output findings grouped by severity: Critical, High, Medium. Include file names and line numbers."
```

### Step 3: Merge Findings

After the external review completes:

1. **Read reviewer output** carefully
2. **Cross-reference** with agent's own findings from Phase 1
3. **Add any new issues** that the agent missed to the review results
4. **Categorize new findings** using the same priority levels:
   - 🚨 **Critical** - Must fix before commit
   - ⚠️ **High Priority** - Should fix before commit
   - 💡 **Medium Priority** - Nice to fix
5. **Ignore duplicates** - Don't report the same issue twice
6. **Present merged results** to the user:

```markdown
## External AI Review ([Codex|Claude])

### New Issues Found: [count]
[List issues not already caught by agent review]

### Confirmed Issues (also found by agent): [count]
[List overlapping findings - increases confidence]

### Positive Highlights
[Any good patterns the reviewer called out]
```

**Action:**

- ✅ If no new critical/high priority issues: Proceed to Phase 2
- ❌ If new critical/high issues found: Agent suggests fixes, user implements, re-run workflow

---

## Phase 2: Check OpenSpec Change Status

Before preparing the commit message, check if there's an open OpenSpec change related to this work:

### Step 1: Detect Open Changes

```bash
ls openspec/changes/ | grep -v archive
```

**If no open changes:** Proceed to Phase 2.2 (Update Specs if needed).

### Step 2: Check Task Completion

If open change exists and relates to committed work:

```bash
cat openspec/changes/<change-id>/tasks.md
```

**Determine WIP status:**

- Count total tasks: `grep -c "^\- \[" openspec/changes/<change-id>/tasks.md`
- Count completed tasks: `grep -c "^\- \[x\]" openspec/changes/<change-id>/tasks.md`

**Decision:**

- **If tasks incomplete (some `[ ]` remain):** Mark commit as `[WIP]` and note the `<change-id>`
- **If all tasks complete (`[x]`):** Normal commit (no WIP prefix)

## Phase 2.2: Update Specs (No Open Proposal)

If no open OpenSpec change exists but the committed code affects existing specs:

### Step 1: Determine if Spec Update Needed

**Check if changes affect documented behavior:**

- [ ] New feature or capability added?
- [ ] Existing behavior modified?
- [ ] API changes?
- [ ] UI/UX changes?

**If YES to any:** Proceed to Step 2.

**If NO (bug fix, refactor, tests only):** Skip to Phase 2.1.

### Step 2: Identify Affected Specs

```bash
ls openspec/specs/
```

**Review which capability specs are affected by the changes.**

### Step 3: Update Specs Directly

For each affected spec in `openspec/specs/<capability>/spec.md`:

1. **Read the current spec** to understand existing requirements
2. **Add/modify requirements** to reflect the new behavior
3. **Ensure each requirement has at least one `#### Scenario:`**
4. **Use proper format:**

```markdown
### Requirement: [Name]
The system SHALL [behavior description].

#### Scenario: [Success case]
- **WHEN** [condition]
- **THEN** [expected result]
```

### Step 4: Validate Spec Changes

```bash
npm run lint:specs:fix
```

**Verify:**

- [ ] Spec files are properly formatted
- [ ] All requirements have scenarios
- [ ] Changes accurately reflect new behavior

### Step 5: Stage Spec Files

```bash
git add openspec/specs/
git status
```

**Note:** Include spec updates in the same commit as the code changes.

---

## Phase 2.1: Verify Jira Ticket

Before preparing the commit message, confirm the Jira ticket:

**Required Input:**

- [ ] **Jira Ticket ID** - Enter the ticket reference (e.g., GITSTATS-123, DEV-456)
- [ ] **Ticket Type** - Confirm the commit type: feat, fix, refactor, test, docs, style, chore, perf
- [ ] **Ticket Status** - Verify ticket is in progress or ready for commit

**Validation:**

- Ticket ID format: `[PROJECT]-[NUMBER]` (e.g., GITSTATS-123)
- Ticket must exist in Jira
- Ticket should be linked to current work

**If ticket not provided:**

- ❌ Stop workflow
- Ask user to provide Jira ticket ID
- Cannot proceed without ticket reference

## Phase 3: Prepare Commit Message

Create a proper commit message following standards:

**Format:**

```text
[TYPE] [TICKET-ID] Brief description (50 chars max)

Detailed explanation (optional)
- Bullet point 1
- Bullet point 2

Fixes: [TICKET-ID]
```

**WIP Format (when OpenSpec change is in progress):**

```text
[WIP] [TYPE] [TICKET-ID] Brief description (50 chars max)

Detailed explanation (optional)
- Bullet point 1
- Bullet point 2

Related: [TICKET-ID]
OpenSpec: [change-id]
```

**Commit Types:** feat, fix, refactor, test, docs, style, chore, perf

**Validation:**

- [ ] Starts with `[TYPE]`
- [ ] Includes `[TICKET-ID]` (from Phase 2)
- [ ] Description is clear and concise
- [ ] Includes `Fixes:` or `Related:` reference

## Phase 4: Stage Changes

Stage all reviewed and approved changes:

```bash
git add [files]
```

**Verify:**

```bash
git status
git diff --cached
```

- [ ] All intended files are staged
- [ ] No accidental files included
- [ ] Changes are logically grouped
- [ ] `jest.config.js` included (if coverage thresholds updated)

## Phase 5: Create Commit

### Decision Point: All Checks Passed?

**If YES (All checks passed):**

- ✅ Code review complete with no critical/high priority issues
- ✅ All tests pass
- ✅ Linting and type checking pass
- ✅ Knip passes (no unused code)
- ✅ Commit size ≤ 4000 LOC
- ✅ `jest.config.js` updated (if coverage thresholds changed)
- ✅ Commit message prepared

**Then:** Proceed to automatic commit creation

**If NO (Issues found):**

- ❌ Critical or high priority issues detected
- ❌ Tests failing
- ❌ Linting or type errors
- ❌ Commit size exceeds limit

**Then:** Fix issues and re-run review

### Create Commit

Create the commit with pre-commit hooks enabled:

```bash
git commit -m "[TYPE] [TICKET-ID] Description"
```

**Critical Rules:**

- ⛔ **NEVER use `--no-verify`** - Pre-commit hooks MUST run
- ⛔ **NEVER use `-n` flag** - This also bypasses hooks
- ✅ Always let pre-commit hooks run

### Handle Hook Failures

If pre-commit hooks fail:

1. **Read the error message** - Understand what failed
2. **Fix the issues:**
   - ESLint errors: `npm run lint -- --fix`
   - TypeScript errors: Fix manually or use `npm run type-check`
   - Test failures: Run `npm run test` and fix failing tests
   - Knip errors: Remove unused code or update `.knip.json`
3. **Stage fixed files:** `git add [fixed-files]`
4. **Retry commit:** `git commit -m "[TYPE] [TICKET-ID] Description"`

### Verify Commit Created

Verify the commit was created correctly:

```bash
git log --oneline -n 1
git show HEAD
```

**Check:**

- [ ] Commit message is correct
- [ ] All intended changes are included
- [ ] No accidental files included
- [ ] Commit size is reasonable
- [ ] `jest.config.js` included (if thresholds updated)

## Phase 6: OpenSpec Change Completion Check

After successful commit, check if there's an open OpenSpec change that matches the committed work:

### Step 1: Check for Open Changes

List open OpenSpec changes:

```bash
ls openspec/changes/ | grep -v archive
```

**If no open changes found:** Skip this phase, proceed to Review Summary.

### Step 2: Verify Change Relevance

If open change(s) exist:

1. **Read the change's `tasks.md`** to understand what work was planned
2. **Compare committed files** with the change scope
3. **Determine if commit relates to the open change**

**Questions to answer:**

- [ ] Does the commit implement tasks from the open change?
- [ ] Are the changed files mentioned in the change's scope?

**If commit doesn't relate to open change:** Skip this phase, proceed to Review Summary.

### Step 3: Check Task Completion Status

If commit relates to an open change, read the tasks file:

```bash
cat openspec/changes/<change-id>/tasks.md
```

**Review task status:**

- Count total tasks: `grep -c "^\- \[" openspec/changes/<change-id>/tasks.md`
- Count completed tasks: `grep -c "^\- \[x\]" openspec/changes/<change-id>/tasks.md`

### Step 4: Offer to Archive (All Tasks Complete)

**If ALL tasks are marked `[x]` (completed):**

Prompt the user:

```markdown
## OpenSpec Change Ready to Archive

The open change `<change-id>` appears to be complete:
- All tasks in `tasks.md` are marked as done
- The committed work matches the change scope

**Would you like to archive this change?**
- This will move the change to `openspec/changes/archive/`
- Specs will be updated accordingly

Reply **yes** to archive, or **no** to skip.
```

**If user confirms (yes):** Run `/openspec-archive <change-id>`

**If user declines (no):** Proceed to Review Summary.

**If NOT all tasks are complete:**

Inform the user:

```markdown
## OpenSpec Change In Progress

The open change `<change-id>` has remaining tasks:
- Completed: X/Y tasks
- Remaining tasks: [list uncompleted tasks]

The change will remain open until all tasks are complete.
```

Proceed to Review Summary.

## Review Summary Template

```markdown
## Commit Review Summary

### Commit Info
- **Hash:** [commit-hash]
- **Message:** [commit-message]
- **Size:** [X LOC]
- **Files Changed:** [count]

### Validation Results
- [ ] Commit size valid (≤ 4000 LOC)
- [ ] Pre-commit hooks passed
- [ ] All tests pass
- [ ] No linting errors
- [ ] TypeScript compiles
- [ ] Knip passes
- [ ] `jest.config.js` updated (if thresholds changed)
- [ ] Commit message valid

### Critical Issues: [count]
[List or "None found ✅"]

### High Priority Issues: [count]
[List or "None found ✅"]

### Medium Priority Issues: [count]
[List or "None found ✅"]

### Positive Highlights
[Call out good practices, well-written code, thorough tests, etc.]

### Recommendation
- [ ] **Approve** - Ready to merge
- [ ] **Approve with suggestions** - Can merge after addressing low/medium issues
- [ ] **Request changes** - Must address issues before merge
- [ ] **Needs discussion** - Architectural or design concerns to discuss
```

## Key Rules Summary

1. ⛔ **NEVER `--no-verify`** - Pre-commit hooks MUST run
2. 📏 **Max 4000 LOC** - Break large changes into smaller commits
3. ✅ **All tests pass** - Run `npm run test` before review
4. 📝 **Clear messages** - Include ticket reference
5. 🔍 **No secrets** - Check for hardcoded credentials
6. 🎯 **Logical grouping** - Related changes in same commit
7. 📋 **Follow format** - Use `[TYPE] [TICKET-ID] Description`
8. 🎨 **Use CSS variables** - No hardcoded hex colors
9. 📦 **Exact versions** - No `^` or `~` in package.json
10. 📊 **Update jest.config.js** - Update coverage thresholds when adding tests
11. 🔧 **Use nvm** - Always run `nvm use` before tests/lint
12. 🤖 **External AI reviewer** - Use `codex review` or `claude -p` as additional reviewer (codex → claude fallback)

## References

- **Coding Guidelines:** `docs/shared/docs/shared/CODING_GUIDELINES.md`
- **Project Documentation:** `openspec/project.md`
- **Color Rules:** See docs/shared/CODING_GUIDELINES.md - "Color Usage Rules"
- **Typography Rules:** See docs/shared/CODING_GUIDELINES.md - "Typography Rules"
- **Testing Rules:** See docs/shared/CODING_GUIDELINES.md - "Testing Rules"
- **Commit Size Rules:** See docs/shared/CODING_GUIDELINES.md - "Commit Size Rules"
