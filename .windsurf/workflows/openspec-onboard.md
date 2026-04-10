---
description: Guided onboarding for OpenSpec - complete workflow cycle with narration
---

# OpenSpec Onboarding

Guided onboarding - walk through a complete workflow cycle with narration and real codebase work.

## Usage

```
/openspec-onboard
```

## Overview

**Time:** ~15-20 minutes

**What we'll do:**

1. Pick a small, real task in your codebase
2. Explore the problem briefly
3. Create a change (the container for our work)
4. Build the artifacts: proposal → specs → design → tasks
5. Implement the tasks
6. Archive the completed change

## Phases

### Phase 1: Welcome

Explain the workflow and what we'll accomplish.

### Phase 2: Task Selection

Scan codebase for small improvement opportunities:

- TODO/FIXME comments
- Missing error handling
- Functions without tests
- Type issues (`: any`)
- Debug artifacts (`console.log`)

Present 3-4 specific suggestions with location and scope.

### Phase 3: Explore Demo

Briefly demonstrate explore mode - investigate the relevant code.

### Phase 4: Create the Change

`openspec new change "<name>"` - explain the folder structure.

### Phase 5-8: Artifacts

Walk through creating each artifact with explanation:

- **Proposal** - WHY we're making this change
- **Specs** - WHAT we're building in precise terms
- **Design** - HOW we'll build it
- **Tasks** - Implementation checklist

### Phase 9: Apply

Implement each task, checking them off as we go.

### Phase 10: Archive

Move completed change to archive.

### Phase 11: Recap

Show command reference and next steps.

## Command Reference

| Command | What it does |
|---------|--------------|
| `/openspec-explore` | Think through problems |
| `/openspec-new` | Start a new change, step by step |
| `/openspec-ff` | Fast-forward: all artifacts at once |
| `/openspec-continue` | Continue an existing change |
| `/openspec-apply` | Implement tasks |
| `/openspec-verify` | Verify implementation |
| `/openspec-archive` | Archive when done |

## Guardrails

- Follow EXPLAIN → DO → SHOW → PAUSE pattern at key transitions
- Keep narration light during implementation
- Don't skip phases - the goal is teaching the workflow
- Handle exits gracefully - never pressure to continue
- Use real codebase tasks - don't simulate
