# DocLab

A doc/code collaboration platform built on top of Git. Teams can write, review, and evolve documentation and code-adjacent content — with all the power of Git underneath, and none of the friction.

## Features

- **Inline comments** — comment on any line, including by non-Git users (guest commenters with their own role system)
- **Change history** — full diff view for every document change, backed by Git commits
- **Apply changes** — review and apply pending changes with approval workflow
- **Pending changes** — propose edits that go through a review cycle before being applied
- **Bidirectional Git sync** — pull from and push to any Git repository automatically
- **Diagram rendering** — Mermaid diagrams, sequence diagrams rendered inline
- **Table rendering** — Markdown tables rendered as styled HTML tables
- **JIRA integration** — view issue status, key, assignee, and priority inline in documents
- **Search** — full-text search across all spaces and documents
- **Spaces** — logical groupings of documents with independent access control
- **Access control** — roles: Admin, Editor, Commenter, Viewer, Guest

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Acronis UI Syntax |
| Backend | Django 5, Django REST Framework, SQLite |
| Auth | Session + Bearer token, OIDC/SSO optional |
| CI | Jenkins + Docker |
| Staging | Docker (frontend `serve`, backend `gunicorn`) |

## Project Structure

```
src/
  frontend/           React + TypeScript application
    components/       Shared UI components
    context/          React contexts (Auth, Theme, UserSettings)
    hooks/            Custom React hooks
    services/         API client modules (spacesApi, documentsApi, …)
    types.ts          All TypeScript types and enums
    utils/            Pure utility functions
    views/            Page-level view components
    tests/
      unit/           Jest unit tests (mirror src/frontend/** paths)
      e2e/            Playwright end-to-end tests
      test-utils/     Shared renderWithProviders helper
  backend/            Django backend
    config/           settings, urls, wsgi
    users/            User models, auth views, permissions, token auth
    wiki/             Wiki models: spaces, documents, comments, changes, git sync
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

## Getting Started

### Prerequisites

- Node.js 25.1.0 (`nvm use`)
- Python 3.12+

### Workspace Setup

This project uses a multi-repository workspace. The frontend is in this repository, and the backend is in a separate repository.

```bash
# Clone and setup the workspace
./scripts/setup-workspace.sh

# Open the workspace in VS Code
code cyber-wiki.code-workspace
```

The workspace includes:
- **cyber-wiki** (this repo) - Frontend React application
- **cyber-wiki-back** - Backend Django application ([https://github.com/max0xf/cyber-wiki-back](https://github.com/max0xf/cyber-wiki-back))

To update both repositories:
```bash
./scripts/update-workspace.sh
```

### Frontend

```bash
nvm use
npm install
npm start            # dev server on http://localhost:3000
```

### Backend

```bash
cd src/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../../.env.example ../.env   # fill in DJANGO_SECRET_KEY at minimum
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Run both together

```bash
./scripts/run-local.sh
```

## Development

```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run type-check    # TypeScript
npm run test          # unit tests (watch mode off)
npm run test:coverage # with coverage report
npm run build         # production build
npm run knip          # dead code detection
```

Backend tests:

```bash
cd src/backend && pytest
```

## CI

The CI pipeline runs inside Docker:

```bash
make ci          # full pipeline in Docker (as Jenkins does)
make ci-local    # same but with limited CPU
```

The pipeline (`build/ci/run.sh`) runs:

1. Backend pytest with coverage
2. Misplaced test file check
3. Spec lint (`markdownlint-cli2`)
4. Prettier format check
5. ESLint
6. `eslint-disable` baseline check
7. TypeScript type check
8. Frontend jest tests with coverage
9. React build
10. Knip (dead code)
11. `npm audit`

## Staging Deployment

Staging is deployed as two Docker containers:

- **Frontend**: `build/Dockerfile.frontend` → `serve -s build -l 3000`
- **Backend**: `build/Dockerfile.backend` → `gunicorn config.wsgi:application`

Set all required environment variables from `.env.example` before deploying.

## Environment Variables

See `.env.example` for a full reference. Minimum required:

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
| `REACT_APP_AUTH_API_URL` | Backend API URL (default: `http://localhost:8000`) |

## Contributing

See `docs/shared/docs/shared/CODING_GUIDELINES.md` for code style, testing, and commit rules.
