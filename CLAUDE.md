# Cyber Wiki — CLAUDE.md

## Project Overview

**cyber-wiki** is a doc/code collaboration platform built on top of Git.

### Key features

- Inline comments (including guest commenters with their own role system)
- Change history with full diff support
- Apply / reject pending changes
- Bidirectional sync to Git repositories
- Diagram rendering (Mermaid, sequence diagrams)
- Table rendering from Markdown
- JIRA integration (issue status, key, assignee)
- Full-text search
- Spaces and access control

### Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Acronis UI Syntax (under `src/frontend/`)
- **Backend**: Django 5 + Django REST Framework + SQLite (under `src/backend/`)
- **CI**: Jenkins + Docker (via `build/ci/Dockerfile` + `build/ci/run.sh`)
- **Staging**: similar to git-stats staging deployment

---

## Commands

### Frontend

```bash
nvm use                        # ensure correct Node version
npm install                    # install dependencies
npm start                      # dev server on :3000
npm run lint                   # ESLint
npm run format                 # Prettier
npm run type-check             # TypeScript
npm run test                   # unit tests
npm run test:ci                # tests with coverage (CI mode)
npm run build                  # production build
npm run knip                   # dead code detection
```

### Backend

```bash
cd src/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
pytest                         # tests with coverage
```

### Full local run

```bash
./scripts/run-local.sh
```

### CI (in Docker)

```bash
make ci
```

---

## Project structure

```
src/
  frontend/           React + TypeScript app
    components/       Shared UI components
    context/          React contexts (Auth, Theme, UserSettings)
    hooks/            Custom React hooks
    services/         API client modules
    types.ts          All TypeScript types and enums
    utils/            Pure utility functions
    views/            Page-level view components
    tests/
      unit/           Jest unit tests (mirror src/frontend/** paths)
      e2e/            Playwright end-to-end tests
      test-utils/     Shared test helpers and renderWithProviders
  backend/            Django backend
    config/           Django settings, urls, wsgi
    users/            User models, auth, permissions, token auth
    wiki/             Wiki models (spaces, documents, comments, changes, git sync)
    tests/            pytest tests
build/                Docker images and CI pipeline
  ci/                 CI Docker image and run script
  Dockerfile.frontend Frontend staging image
  Dockerfile.backend  Backend staging image
  .dockerignore       Docker build context exclusions
scripts/              Dev helper scripts
docs/                 Documentation
  specs/              Project-wide specs (PRD)
  components/         Per-component design docs
    frontend/         Frontend architecture and design
    backend/          Backend architecture and design
```

---

## Coding rules (summary)

- **English only** — all docs, specs, comments, commit messages
- **Exact versions** in `package.json` — no `^` or `~`
- **Enums** over union types for predefined string sets
- **Braces required** on all control flow (`curly: ["error","all"]`)
- **No eslint-disable** — fix code instead; baseline is 0
- **Single assertion per test** (rare exceptions allowed)
- **Test files** must live under `src/frontend/tests/unit/` mirroring source paths
- **No skipped tests** (`it.skip` forbidden); use `it.todo` for planned tests
- **Max commit size**: 4000 LOC — split larger changes
- **No hardcoded hex colours** — use `@acronis-platform/ui-syntax` CSS variables

See `docs/shared/docs/shared/CODING_GUIDELINES.md` for the full reference.
