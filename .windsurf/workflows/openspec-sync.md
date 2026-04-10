---
description: Sync delta specs from a change to main specs
---

# OpenSpec Sync Specs

Sync delta specs from a change to main specs without archiving the change.

## Usage

```
/openspec-sync [change-name]
```

If no change name provided, will prompt for selection.

## Steps

1. **Select change** - Prompt for selection if not provided
2. **Find delta specs** - Look in `openspec/changes/<name>/specs/*/spec.md`
3. **Apply changes** - For each delta spec, update main specs intelligently
4. **Show summary** - Which capabilities were updated, what changes were made

## Delta Spec Sections

- `## ADDED Requirements` - New requirements to add
- `## MODIFIED Requirements` - Changes to existing requirements
- `## REMOVED Requirements` - Requirements to remove
- `## RENAMED Requirements` - Requirements to rename (FROM:/TO:)

## Intelligent Merging

Unlike programmatic merging, apply **partial updates**:

- To add a scenario, just include that scenario under MODIFIED
- The delta represents *intent*, not wholesale replacement
- Preserve existing content not mentioned in delta

## Output

```
## Specs Synced: <change-name>

Updated main specs:

**auth**:
- Added requirement: "OAuth Provider Integration"
- Modified requirement: "Session Management" (added 1 scenario)

**api**:
- Created new spec file
- Added requirement: "Rate Limiting"

Main specs are now updated. The change remains active - archive when implementation is complete.
```

## Guardrails

- Read both delta and main specs before making changes
- Preserve existing content not mentioned in delta
- If something is unclear, ask for clarification
- The operation should be idempotent - running twice gives same result
