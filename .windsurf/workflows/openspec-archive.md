---
description: Archive a completed OpenSpec change
---

# OpenSpec Archive Change

Archive a completed change after implementation is complete.

## Usage

```
/openspec-archive [change-name]
```

If no change name provided, will prompt for selection from available changes.

## Steps

1. **Select change** - Prompt for selection if not provided
2. **Check artifact completion** - `openspec status --change "<name>" --json`
3. **Check task completion** - Read tasks.md, count incomplete vs complete
4. **Assess delta spec sync** - Check for delta specs, compare with main specs
5. **Perform archive** - Move to `openspec/changes/archive/YYYY-MM-DD-<name>/`
6. **Display summary** - Show archive location, sync status, warnings

## Sync Options

If delta specs exist:

- **Sync now (recommended)** - Apply delta specs to main specs before archiving
- **Archive without syncing** - Keep main specs unchanged

## Output

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs

All artifacts complete. All tasks complete.
```

## Guardrails

- Always prompt for change selection if not provided
- Don't block archive on warnings - just inform and confirm
- Show clear summary of what happened
