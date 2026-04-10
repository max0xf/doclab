```prompt
---
description: Sync delta specs from a change to main specs
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Read both delta and main specs before making changes
- Preserve existing content not mentioned in delta
- If something is unclear, ask for clarification
- The operation should be idempotent - running twice gives same result

**Steps**
1. **Select change** - Prompt for selection if not provided using `openspec list`
2. **Find delta specs** - Look in `openspec/changes/<name>/specs/*/spec.md`
3. **Apply changes** - For each delta spec, update main specs intelligently:
   - `## ADDED Requirements` - New requirements to add
   - `## MODIFIED Requirements` - Changes to existing requirements
   - `## REMOVED Requirements` - Requirements to remove
   - `## RENAMED Requirements` - Requirements to rename (FROM:/TO:)
4. **Show summary** - Which capabilities were updated, what changes were made

**Intelligent Merging**
Unlike programmatic merging, apply **partial updates**:
- To add a scenario, just include that scenario under MODIFIED
- The delta represents *intent*, not wholesale replacement
- Preserve existing content not mentioned in delta

**Output**
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

**Reference**
- Use `openspec list --specs` to see all main specs
- Use `openspec show <spec> --type spec` to view spec details
<!-- OPENSPEC:END -->

```
