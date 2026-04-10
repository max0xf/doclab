# E2E Tests

End-to-end tests use [Playwright](https://playwright.dev/).

## Running

```bash
npm run e2e          # headless
npm run e2e:ui       # interactive UI mode
npm run e2e:report   # view last report
```

## Structure

```
src/frontend/tests/e2e/
  specs/        # test spec files (*.spec.ts)
  fixtures/     # shared test fixtures
  helpers/      # reusable page-object helpers
```

## Writing Tests

- Place specs under `specs/`
- Use Page Object pattern for reusable selectors
- Tests must not depend on order of execution
