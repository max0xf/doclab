```prompt
---
description: Archive multiple completed OpenSpec changes at once
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Always prompt for selection, never auto-select
- Detect spec conflicts early and resolve by checking codebase
- Use single confirmation for entire batch
- Track and report all outcomes (success/skip/fail)

**Steps**
1. **Get active changes** - Run `openspec list --json`
2. **Prompt for selection** - Multi-select with "All changes" option
3. **Batch validation** - Gather status for all selected changes
4. **Detect spec conflicts** - Find changes touching same capabilities
5. **Resolve conflicts** - Check codebase to determine what's implemented
6. **Show status table** - Display consolidated status for all changes
7. **Confirm batch** - Single confirmation for entire operation
8. **Execute archive** - Process each change with spec sync
9. **Display summary** - Show results for all changes

**Conflict Resolution**
When 2+ changes touch the same capability spec:
- Check codebase for implementation evidence
- If only one implemented → sync that one's specs
- If both implemented → apply in chronological order
- If neither implemented → skip sync, warn user

**Output**
```
## Bulk Archive Complete

Archived 3 changes:
- schema-management-cli -> archive/2026-01-19-schema-management-cli/
- project-config -> archive/2026-01-19-project-config/
- add-oauth -> archive/2026-01-19-add-oauth/

Spec sync summary:
- 4 delta specs synced to main specs
- 1 conflict resolved (auth: applied both in chronological order)
```

**Reference**
- Use `openspec list` to see all changes
- Use `rg` to search codebase for implementation evidence
<!-- OPENSPEC:END -->

```
