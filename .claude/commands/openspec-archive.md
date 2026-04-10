---
name: openspec-archive
description: Archive a deployed OpenSpec change and update specs.
---

# OpenSpec Archive Workflow

**Guardrails**

- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/project.md` if you need additional OpenSpec conventions or clarifications.

**Steps**

1. Determine the change ID to archive:
   - If this prompt already includes a specific change ID, use that value after trimming whitespace.
   - If the conversation references a change loosely (for example by title or summary), list `openspec/changes/` to surface likely IDs, share the relevant candidates, and confirm which one the user intends.
   - Otherwise, review the conversation, list changes, and ask the user which change to archive; wait for a confirmed change ID before proceeding.
   - If you still cannot identify a single change ID, stop and tell the user you cannot archive anything yet.
2. Validate the change ID by checking `openspec/changes/<id>/` exists and stop if the change is missing, already archived, or otherwise not ready to archive.
3. Move the change folder to `openspec/changes/archive/<id>/`.
4. Review the moved files to confirm the change landed in `changes/archive/`.
5. Update related specs if needed.

**Reference**

- List `openspec/changes/` to confirm change IDs before archiving.
- Inspect specs in `openspec/specs/` and address any validation issues before handing off.
