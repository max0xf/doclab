---
description: Fast-forward through OpenSpec artifact creation
---

# OpenSpec Fast-Forward

Fast-forward through artifact creation - generate everything needed to start implementation in one go.

## Usage

```
/openspec-ff <change-name-or-description>
```

If no clear input, will ask what you want to build.

## Steps

1. **Get input** - Change name (kebab-case) or description of what to build
2. **Create change** - `openspec new change "<name>"`
3. **Get build order** - `openspec status --change "<name>" --json`
4. **Create artifacts in sequence** - Loop until all `applyRequires` artifacts are complete
5. **Show final status** - `openspec status --change "<name>"`

## Artifact Creation Loop

For each ready artifact:

1. Get instructions: `openspec instructions <artifact-id> --change "<name>" --json`
2. Read dependency files for context
3. Create artifact using `template` as structure
4. Show brief progress: "✓ Created <artifact-id>"
5. Re-check status, continue until `applyRequires` complete

## Output

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

## Guardrails

- Create ALL artifacts needed for implementation
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask - but prefer making reasonable decisions
- If change already exists, suggest continuing that change instead
- `context` and `rules` are constraints for YOU, not content for the file
