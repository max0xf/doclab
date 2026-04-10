```prompt
---
description: Review code changes and create commit following cyber-wiki standards
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Overview**
This workflow reviews changed code for quality, security, and compliance, then creates a commit if all checks pass.

**Detailed review criteria are defined in:**
- `docs/shared/docs/shared/CODING_GUIDELINES.md` - Coding standards and best practices
- `openspec/project.md` - Project architecture and OpenSpec workflow

**Context Initialization**
Run `/init-flow` before starting the review process to clear any previous context:
- Reset mental state - start fresh analysis
- Forget previous review sessions
- Clear any cached assumptions about the code
- Focus only on current changes in this workflow execution

**Instructions for AI:**
1. Do NOT reference any previous code changes or discussions
2. Do NOT assume any file states from prior context
3. Always re-read files fresh before making changes
4. Treat this as a completely new session

**Phase 0: Automatic File Detection & Analysis**

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

**Phase 1: Code Review of Changes**

Agent performs comprehensive code review by applying rules to each file:
1. **Load and parse docs/shared/CODING_GUIDELINES.md** - Extract all rules
2. **Apply rules to changed files** - Check each file against applicable rules
3. **Document violations** - List all issues found with severity and location
4. **Provide recommendations** - Suggest fixes for each issue

**Phase 2: Commit Creation**

If all checks pass:
1. **Stage changes** - `git add <files>`
   - ⛔ **NEVER stage files from `openspec/changes/`** - These are working artifacts only
   - ✅ Only stage `openspec/specs/` files when updating main specs
2. **Create commit** - `git commit -m "<message>"` following project conventions
3. **Confirm completion** - Show commit hash and summary

**Guardrails**
- Always start fresh - no context from previous sessions
- Review ALL changed files automatically
- Apply ALL applicable rules from docs/shared/CODING_GUIDELINES.md
- Block commit if critical issues found
- Follow cyber-wiki commit message conventions

**Reference**
- Use `git diff` to see changes
- Read `docs/shared/docs/shared/CODING_GUIDELINES.md` for standards
- Read `openspec/project.md` for architecture
<!-- OPENSPEC:END -->

```
