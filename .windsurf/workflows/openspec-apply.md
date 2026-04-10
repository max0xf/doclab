---
description: Implement tasks from an OpenSpec change
---

# OpenSpec Apply Change

Implement tasks from an OpenSpec change. Use when you want to start implementing, continue implementation, or work through tasks.

## Usage

```
/openspec-apply [change-name]
```

If no change name provided, will prompt for selection from available changes.

## Steps

1. **Select the change** - Auto-selects if only one active change exists, otherwise prompts
2. **Check status** - `openspec status --change "<name>" --json`
3. **Get apply instructions** - `openspec instructions apply --change "<name>" --json`
4. **Read context files** - Read files listed in `contextFiles` from instructions
5. **Show progress** - Display schema, progress, remaining tasks
6. **Implement tasks** - Loop through pending tasks, make code changes, mark complete

## Task Implementation Loop

For each pending task:

- Show which task is being worked on
- Make the code changes required
- Keep changes minimal and focused
- Mark task complete: `- [ ]` → `- [x]`
- Continue to next task

**Pause if:**

- Task is unclear → ask for clarification
- Implementation reveals a design issue → suggest updating artifacts
- Error or blocker encountered → report and wait for guidance

## Output

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete
```

## Guardrails

- Keep going through tasks until done or blocked
- Always read context files before starting
- If task is ambiguous, pause and ask before implementing
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
