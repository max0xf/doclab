---
description: Run developer onboarding guide for new team members
---

# Developer Onboarding Workflow

This workflow guides new developers through the onboarding process.

## Steps

// turbo

1. **Read the onboarding manual**

   ```bash
   cat docs/ONBOARDING.md
   ```

2. **Run the setup script** (macOS/Linux)

   ```bash
   ./scripts/setup-dev.sh
   ```

   Or for Windows (PowerShell):

   ```powershell
   .\scripts\setup-dev.ps1
   ```

3. **Install OpenSpec CLI**

   ```bash
   npm i -g @fission-ai/openspec
   ```

4. **Create environment file**

   ```bash
   cp .env.example .env.dev
   ```

   Then generate a Django secret key and update `.env.dev`:

   ```bash
   python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

   Copy the output and set it as `DJANGO_SECRET_KEY` in `.env.dev`.

5. **Create backend environment file**

   ```bash
   cp src/backend/.env.example src/backend/.env
   ```

   For local development, update `src/backend/.env`:
   - Set `CLICKHOUSE_HOST=10.35.62.55` (staging database)
   - Set `SSO_ENABLED=false` (use local login)

6. **Create a local admin user**

   ```bash
   cd server && source venv/bin/activate && python manage.py createsuperuser
   ```

   Follow the prompts to set username, email, and password.

7. **Start local development**

   ```bash
   ./scripts/run-local.sh
   ```

8. **Read project conventions**

   ```bash
   cat openspec/project.md
   ```

9. **Read coding guidelines**

   ```bash
   cat docs/shared/CODING_GUIDELINES.md
   ```

## Quick Reference

- **Frontend:** <http://localhost:3000>
- **Backend:** <http://localhost:8000>
- **Admin:** <http://localhost:8000/admin/>

## Next Steps

After completing onboarding:

1. Try the guided OpenSpec onboarding with `/openspec-onboard`
2. Or create a feature with `/openspec-new` or `/openspec-ff`
3. Make your first commit with `/review-and-commit`

## OpenSpec Workflows

| Command | Description |
|---------|-------------|
| `/openspec-onboard` | Guided onboarding - complete workflow cycle |
| `/openspec-explore` | Think through problems before implementing |
| `/openspec-new` | Start a new change, step by step |
| `/openspec-ff` | Fast-forward: all artifacts at once |
| `/openspec-continue` | Continue an existing change |
| `/openspec-apply` | Implement tasks from a change |
| `/openspec-verify` | Verify implementation matches artifacts |
| `/openspec-archive` | Archive a completed change |
| `/openspec-sync` | Sync delta specs to main specs |
| `/openspec-bulk-archive` | Archive multiple changes at once |
