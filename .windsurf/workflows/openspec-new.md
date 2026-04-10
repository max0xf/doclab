---
description: Start a new OpenSpec change with step-by-step artifact creation
---

# OpenSpec New Change

Start a new change using the artifact-driven approach with step-by-step guidance.

## Usage

```
/openspec-new <change-name-or-description>
```

If no clear input, will ask what you want to build.

## Steps

0. run `/init-flow.md`
1. **Get input** - Change name (kebab-case) or description
2. **Determine schema** - Use default unless user requests specific workflow
3. **Create change** - `openspec new change "<name>"`
4. **Show status** - `openspec status --change "<name>"`
5. **Get first artifact instructions** - `openspec instructions <first-artifact> --change "<name>"`
6. **STOP and wait** - Show template, wait for user direction

## Output

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

## Phase: External AI Review of Artifacts (Optional)

After the agent drafts an artifact (proposal, specs, design, or tasks), run an external AI reviewer for a second opinion before finalizing. Tries `codex` first, falls back to `claude`.

### Step 1: Detect Available Reviewer

// turbo

```bash
which codex 2>/dev/null || which claude 2>/dev/null
```

**Decision tree:**

- **`codex` found** → Use Codex as reviewer (Step 2a)
- **`codex` NOT found, `claude` found** → Use Claude as reviewer (Step 2b)
- **Neither found** → Skip this phase, proceed without external review

### Step 2a: Run Codex Review

```bash
cat openspec/changes/<change-id>/<artifact>.md | codex review -
```

### Step 2b: Run Claude Review (Fallback)

```bash
cat openspec/changes/<change-id>/<artifact>.md | claude -p "You are reviewing an OpenSpec artifact (<artifact-type>) for a TypeScript/React project (cyber-wiki). Review for: completeness, clarity, feasibility, missing edge cases, alignment with project architecture. Project context: see openspec/project.md for architecture. Output findings grouped by severity: Critical (blocks progress), High (should address), Medium (nice to have). Be concise."
```

### Step 3: Merge Findings

After the external review completes:

1. **Read reviewer output** carefully
2. **Cross-reference** with the agent's own assessment of the artifact
3. **Categorize findings** using priority levels:
   - **Critical** - Blocks progress, must address before finalizing artifact
   - **High Priority** - Should address before finalizing
   - **Medium Priority** - Nice to improve
4. **Present merged results** to the user:

```markdown
## External AI Review of [artifact-type] ([Codex|Claude])

### Issues Found: [count]
[List issues with suggested improvements]

### Confirmed Quality
[Aspects the reviewer validated as solid]

### Suggestions
[Optional improvements that could strengthen the artifact]
```

**Action:**

- If no critical/high issues: Proceed with artifact as-is
- If issues found: Suggest improvements, apply after user approval

## Guardrails

- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
- If name is invalid (not kebab-case), ask for a valid name
- If change already exists, suggest continuing that change instead
