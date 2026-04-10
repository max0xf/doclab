```prompt
---
description: Continue working on an OpenSpec change by creating the next artifact
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- `context` and `rules` are constraints for YOU, not content for the file

**Steps**
1. **Select change** - Show top 3-4 most recently modified changes if no change name provided.
2. **Check status** - Run `openspec status --change "<name>" --json`
3. **Act based on status**:
   - All complete → Congratulate, suggest archive
   - Artifacts ready → Create next artifact
   - All blocked → Show status, suggest checking for issues
4. **Create artifact** (if ready):
   - Get instructions: `openspec instructions <artifact-id> --change "<name>" --json`
   - Read dependency files for context
   - Use `template` as structure, apply `context` and `rules` as constraints
   - Write to `outputPath`
5. **Show progress** - Display what was created and what's unlocked

**Output**
```
✓ Created design.md

Progress: 3/4 artifacts complete
Now unlocked: tasks

Want to continue? Just ask me to continue or tell me what to do next.
```

**Reference**
- Use `openspec list` to see all available changes
- Use `openspec show <id>` for change details
<!-- OPENSPEC:END -->

```
