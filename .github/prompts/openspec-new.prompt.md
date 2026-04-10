```prompt
---
description: Start a new OpenSpec change with step-by-step artifact creation
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
- If name is invalid (not kebab-case), ask for a valid name
- If change already exists, suggest continuing that change instead
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Steps**
0. **Context initialization** - Run `/init-flow` to reset mental state and start fresh analysis
1. **Get input** - Change name (kebab-case) or description. If no clear input, ask what you want to build.
2. **Determine schema** - Use default schema unless user requests specific workflow
3. **Create change** - Run `openspec new change "<name>"`
4. **Show status** - Run `openspec status --change "<name>"`
5. **Get first artifact instructions** - Run `openspec instructions <first-artifact> --change "<name>"`
6. **STOP and wait** - Show template, wait for user direction. Do NOT create any artifacts yet.

**Output**
```
## New Change Created: add-user-auth

Location: openspec/changes/add-user-auth/
Schema: spec-driven
Progress: 0/4 artifacts complete

Artifact sequence: proposal → specs → design → tasks

### First Artifact: proposal

[Template content shown here]

Ready to create the first artifact? Just describe what this change is about and I'll draft it, or ask me to continue.
```

**Reference**
- Use `openspec list` to check for existing changes
- Use `openspec show <id>` for change details
<!-- OPENSPEC:END -->

```
