---
description: Continue working on an OpenSpec change by creating the next artifact
---

# OpenSpec Continue Change

Continue working on a change by creating the next artifact in the workflow.

## Usage

```
/openspec-continue [change-name]
```

If no change name provided, will show recent changes sorted by last modified.

## Steps

1. **Select change** - Show top 3-4 most recently modified changes
2. **Check status** - `openspec status --change "<name>" --json`
3. **Act based on status**:
   - All complete → Congratulate, suggest archive
   - Artifacts ready → Create next artifact
   - All blocked → Show status, suggest checking for issues
4. **Show progress** - Display what was created and what's unlocked

## Artifact Creation

For each ready artifact:

1. Get instructions: `openspec instructions <artifact-id> --change "<name>" --json`
2. Read dependency files for context
3. Use `template` as structure, apply `context` and `rules` as constraints
4. Write to `outputPath`
5. Show progress

**Create ONE artifact per invocation.**

## Output

```
✓ Created design.md

Progress: 3/4 artifacts complete
Now unlocked: tasks

Want to continue? Just ask me to continue or tell me what to do next.
```

## Guardrails

- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- `context` and `rules` are constraints for YOU, not content for the file
