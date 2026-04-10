```prompt
---
description: Verify implementation matches OpenSpec change artifacts
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Every issue must have a specific recommendation with file references
- When uncertain, prefer SUGGESTION over WARNING, WARNING over CRITICAL
- If only tasks.md exists, verify task completion only
- Always note which checks were skipped and why

**Steps**
1. **Select change** - Prompt for selection if not provided using `openspec list`
2. **Check status** - Run `openspec status --change "<name>" --json`
3. **Load artifacts** - Read all available artifacts from contextFiles
4. **Verify Completeness** - Task completion, spec coverage
5. **Verify Correctness** - Requirement implementation, scenario coverage
6. **Verify Coherence** - Design adherence, pattern consistency
7. **Generate report** - Summary scorecard with issues by priority

**Verification Dimensions**

### Completeness
- **Task Completion** - Count complete vs total tasks
- **Spec Coverage** - Search codebase for requirement implementations

### Correctness
- **Requirement Mapping** - Find implementation evidence, assess match
- **Scenario Coverage** - Check if conditions handled, tests exist

### Coherence
- **Design Adherence** - Verify implementation follows design decisions
- **Pattern Consistency** - Check file naming, structure, coding style

**Issue Priorities**
- **CRITICAL** - Must fix before archive (incomplete tasks, missing requirements)
- **WARNING** - Should fix (spec divergences, missing scenario coverage)
- **SUGGESTION** - Nice to fix (pattern inconsistencies)

**Output**
```
## Verification Report: add-user-auth

### Summary
| Dimension    | Status           |
|--------------|------------------|
| Completeness | 7/7 tasks, 3 reqs|
| Correctness  | 3/3 reqs covered |
| Coherence    | Design followed  |

### Issues

**CRITICAL** (Must fix before archive):
- None

**WARNING** (Should fix):
- Scenario "Invalid token" not covered in tests
  → Add test in `src/auth/__tests__/token.test.ts`

**SUGGESTION** (Nice to fix):
- Consider adding JSDoc to `validateToken` function

### Assessment
No critical issues. 1 warning to consider. Ready for archive.
```

**Reference**
- Use `openspec show <id>` for change details
- Use `rg` to search codebase for implementation evidence
<!-- OPENSPEC:END -->

```
