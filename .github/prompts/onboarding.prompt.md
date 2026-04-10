```prompt
---
description: Run developer onboarding guide for new team members
---

$ARGUMENTS
<!-- OPENSPEC:START -->
**Overview**
This workflow guides new developers through the onboarding process.

**Steps**

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

5. **Install dependencies**
   - Frontend: `npm install`
   - Backend: `cd server && pip install -r requirements.txt`

6. **Start development servers**
   - Frontend: `npm start`
   - Backend: `cd server && python manage.py runserver`

7. **Verify setup**
   - Open http://localhost:3000
   - Check that the app loads correctly
   - Run tests: `npm test`

**Reference**
- See `docs/ONBOARDING.md` for detailed instructions
- See `README.md` for project overview
- See `docs/shared/docs/shared/CODING_GUIDELINES.md` for coding standards
<!-- OPENSPEC:END -->

```
