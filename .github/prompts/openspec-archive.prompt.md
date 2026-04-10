---
description: Archive a deployed OpenSpec change and update specs.
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Steps**
1. **Select change** - Prompt for selection if not provided. Use `openspec list` to show available changes.
2. **Check artifact completion** - Run `openspec status --change "<name>" --json` to verify all artifacts are complete.
3. **Check task completion** - Read tasks.md, count incomplete vs complete tasks.
4. **Assess delta spec sync** - Check for delta specs in `openspec/changes/<name>/specs/`, compare with main specs.
5. **Confirm sync option** - If delta specs exist:
   - **Sync now (recommended)** - Apply delta specs to main specs before archiving
   - **Archive without syncing** - Keep main specs unchanged
6. **Perform archive** - Move to `openspec/changes/archive/YYYY-MM-DD-<name>/`
7. **Display summary** - Show archive location, sync status, any warnings.

**Guardrails**
- Always prompt for change selection if not provided
- Don't block archive on warnings - just inform and confirm
- Show clear summary of what happened

**Reference**
- Use `openspec list` to confirm change IDs before archiving.
- Inspect refreshed specs with `openspec list --specs` and address any validation issues before handing off.
<!-- OPENSPEC:END -->
