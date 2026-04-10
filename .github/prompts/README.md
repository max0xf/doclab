# GitHub Copilot Prompts

This directory contains prompt files for GitHub Copilot slash commands to streamline development workflows.

## Available Prompts

### OpenSpec Workflow Prompts

#### Core Workflow
- **`openspec-new`** - Start a new OpenSpec change with step-by-step artifact creation
- **`openspec-proposal`** - Scaffold a new OpenSpec change and validate strictly
- **`openspec-ff`** - Fast-forward through artifact creation (proposal → specs → design → tasks)
- **`openspec-continue`** - Continue working on an existing change by creating the next artifact
- **`openspec-apply`** - Implement tasks from an OpenSpec change
- **`openspec-verify`** - Verify implementation matches OpenSpec change artifacts
- **`openspec-archive`** - Archive a completed OpenSpec change

#### Advanced Operations
- **`openspec-explore`** - Enter explore mode - thinking partner for ideas and problems
- **`openspec-sync`** - Sync delta specs from a change to main specs
- **`openspec-bulk-archive`** - Archive multiple completed OpenSpec changes at once

#### Learning & Onboarding
- **`openspec-onboard`** - Guided onboarding for OpenSpec - complete workflow cycle with narration
- **`onboarding`** - Run developer onboarding guide for new team members

### Code Quality Prompts
- **`review-and-commit`** - Review code changes and create commit following cyber-wiki standards

## Usage

All prompts can be invoked using GitHub Copilot's slash command syntax:

```
@workspace /openspec-new <change-name-or-description>
@workspace /openspec-proposal <change-name-or-description>
@workspace /openspec-ff <change-name-or-description>
@workspace /openspec-apply [change-name]
@workspace /openspec-verify [change-name]
@workspace /review-and-commit
```

## Prompt Structure

Each prompt file follows this structure:

```markdown
\`\`\`prompt
---
description: Brief description of what the prompt does
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Guardrails**
- Rules and constraints for the agent

**Steps**
1. Step-by-step instructions
2. ...

**Reference**
- Additional references and commands
<!-- OPENSPEC:END -->
\`\`\`
```

## Workflow Guide

### Starting a New Change

**Interactive path (recommended for first time):**
```
@workspace /openspec-new add-user-authentication
```

**Quick path (all artifacts at once):**
```
@workspace /openspec-ff add-user-authentication
```

**Manual path (full control):**
```
@workspace /openspec-proposal add-user-authentication
@workspace /openspec-continue add-user-authentication
```

### Working on a Change

**Implement tasks:**
```
@workspace /openspec-apply add-user-authentication
```

**Verify implementation:**
```
@workspace /openspec-verify add-user-authentication
```

### Completing a Change

**Archive when done:**
```
@workspace /openspec-archive add-user-authentication
```

**Archive multiple changes:**
```
@workspace /openspec-bulk-archive
```

## Related Documentation

- `/.windsurf/workflows/` - Source workflows for Windsurf IDE
- `/openspec/AGENTS.md` - OpenSpec agent instructions
- `/openspec/project.md` - Project architecture and conventions
- `/docs/shared/CODING_GUIDELINES.md` - Coding standards and best practices

## Maintenance

These prompts are synchronized from `.windsurf/workflows/` to maintain consistency across different IDEs and AI assistants. When updating workflows, ensure both directories are kept in sync.

## For New Developers

Start with:
```
@workspace /onboarding
```

This will guide you through the complete setup process and introduce you to the development workflow.

Then learn OpenSpec:
```
@workspace /openspec-onboard
```

This provides a hands-on walkthrough of the complete OpenSpec workflow cycle.
