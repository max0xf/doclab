---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Steps**
Track these steps as TODOs and complete them one by one.
1. **Select the change** - Auto-select if only one active change exists, otherwise prompt for selection.
2. **Check status** - Run `openspec status --change "<name>" --json`
3. **Get apply instructions** - Run `openspec instructions apply --change "<name>" --json`
4. **Read context files** - Read files listed in `contextFiles` from instructions (proposal.md, design.md, tasks.md, and any relevant specs).
5. **Show progress** - Display schema, progress summary, and remaining tasks.
6. **Implement tasks** - Loop through pending tasks sequentially:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete: `- [ ]` → `- [x]`
   - Continue to next task

**Pause if:**
- Task is unclear → ask for clarification
- Implementation reveals a design issue → suggest updating artifacts
- Error or blocker encountered → report and wait for guidance

**Reference**
- Use `openspec show <id> --json --deltas-only` if you need additional context from the proposal while implementing.
- Use `openspec list` to list all changes when needed.
<!-- OPENSPEC:END -->
