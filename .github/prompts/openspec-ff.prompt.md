```prompt
---
description: Fast-forward through OpenSpec artifact creation
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Create ALL artifacts needed for implementation
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask - but prefer making reasonable decisions
- If change already exists, suggest continuing that change instead
- `context` and `rules` are constraints for YOU, not content for the file

**Steps**
1. **Get input** - Change name (kebab-case) or description of what to build
2. **Create change** - Run `openspec new change "<name>"`
3. **Get build order** - Run `openspec status --change "<name>" --json`
4. **Create artifacts in sequence** - Loop until all `applyRequires` artifacts are complete:
   - Get instructions: `openspec instructions <artifact-id> --change "<name>" --json`
   - Read dependency files for context
   - Create artifact using `template` as structure
   - Show brief progress: "✓ Created <artifact-id>"
   - Re-check status, continue until `applyRequires` complete
5. **Show final status** - Run `openspec status --change "<name>"`

**Output**
```
## Fast-Forward Complete: add-user-auth

Created artifacts:
- ✓ proposal.md - Why we're adding user authentication
- ✓ specs/auth/spec.md - Authentication requirements
- ✓ design.md - Technical approach
- ✓ tasks.md - 7 implementation tasks

Ready for implementation!
Run `/openspec-apply` or ask me to implement to start working on the tasks.
```

**Reference**
- Use `openspec list` to check existing changes
- Use `openspec validate <id> --strict` to validate the change
<!-- OPENSPEC:END -->

```
