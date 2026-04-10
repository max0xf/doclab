```prompt
---
description: Reset context for fresh analysis before starting any workflow
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Context Initialization**

Before starting any workflow, clear any previous context:

- Reset mental state - start fresh analysis
- Forget previous review sessions
- Clear any cached assumptions about the code
- Focus only on current changes in this workflow execution

**Instructions for AI:**

When this workflow is invoked:

1. Do NOT reference any previous code changes or discussions
2. Do NOT assume any file states from prior context
3. Always re-read files fresh before making changes
4. Treat this as a completely new session

**Status:** Context reset. Awaiting new task.

This ensures objective, unbiased code review without influence from prior context.

**Reference**
- This prompt should be run at the beginning of any complex workflow to ensure clean state
- Particularly useful before `/review-and-commit` or `/openspec-apply` workflows
<!-- OPENSPEC:END -->

```
