---
name: openspec-apply
description: Implement an approved OpenSpec change and keep tasks in sync.
---

# OpenSpec Apply Workflow

**Guardrails**

- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/project.md` if you need additional OpenSpec conventions or clarifications.

**Steps**

Track these steps as TODOs and complete them one by one.

1. Read `changes/<id>/proposal.md`, `design.md` (if present), and `tasks.md` to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
3. Confirm completion before updating statuses—make sure every item in `tasks.md` is finished.
4. Update the checklist after all work is done so each task is marked `- [x]` and reflects reality.
5. Reference spec files in `openspec/specs/` when additional context is required.

**Reference**

- Read `openspec/changes/<id>/proposal.md` for the full proposal details while implementing.
