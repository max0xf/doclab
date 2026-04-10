# Coding Guidelines for Cyber Wiki

## Documentation Language

### ⚠️ IMPORTANT: English only

**ALL documentation and specifications MUST be written in English only.**

This includes:

- OpenSpec proposals, tasks, and design documents
- Code comments and JSDoc/docstrings
- README files and markdown documentation
- Commit messages
- PR descriptions and titles
- Whatsnew entries

No exceptions. This ensures consistency and accessibility for all team members.

---

## Dependency Management Rules

### ⚠️ IMPORTANT: Use exact versions only

**NEVER use caret (^) or tilde (~) in package versions.**

When adding dependencies to `package.json`, always use exact versions:

```json
// ❌ Wrong - allows automatic updates
"dependencies": {
  "react": "^18.2.0",
  "lodash": "~4.17.21"
}

// ✅ Correct - exact versions only
"dependencies": {
  "react": "18.2.0",
  "lodash": "4.17.21"
}
```

### Why exact versions?

1. **Reproducibility** - Same version on all environments
2. **Stability** - No unexpected breaking changes
3. **Security** - Controlled updates through explicit version bumps
4. **Debugging** - Easier to track issues to specific versions

### Installing packages

```bash
# Use --save-exact flag
npm install --save-exact package-name

# Or configure npm to always use exact versions
npm config set save-exact true
```

### After installation checklist

1. **Check for vulnerabilities:**

    ```bash
    npm audit
    ```

2. **Verify no ^ or ~ in package.json:**

    ```bash
    grep -E '"\^|"~' package.json
    ```

    Should return empty result.

3. **Update overrides if needed** - if vulnerabilities found, update versions in `overrides` section.

4. **Run tests** to ensure nothing is broken:

    ```bash
    npm run lint --fix
    npm run format
    npm run build
    ```

---

## Typography Rules

### ⚠️ IMPORTANT: Use `ui-syntax` CSS variables for fonts

**Prefer CSS variables** from `@acronis-platform/ui-syntax` for font properties.

### Font Family Variables

| Variable | Value |
|----------|-------|
| `var(--acv-base-font-family-inter)` | Inter, sans-serif |
| `var(--acv-base-font-family-roboto)` | Roboto, system fonts |
| `var(--acv-base-font-family-system-ui)` | system-ui, sans-serif |
| `var(--acv-base-font-family-mono)` | Monospace fonts |

### Font Size Variables

| Variable | Size |
|----------|------|
| `var(--acv-base-font-size-10)` | 10px |
| `var(--acv-base-font-size-11)` | 11px |
| `var(--acv-base-font-size-12)` | 12px |
| `var(--acv-base-font-size-14)` | 14px |
| `var(--acv-base-font-size-16)` | 16px |
| `var(--acv-base-font-size-18)` | 18px |
| `var(--acv-base-font-size-20)` | 20px |
| `var(--acv-base-font-size-24)` | 24px |
| `var(--acv-base-font-size-32)` | 32px |
| `var(--acv-base-font-size-40)` | 40px |
| `var(--acv-base-font-size-48)` | 48px |

### Font Weight Variables

| Variable | Weight |
|----------|--------|
| `var(--acv-base-font-weight-light)` | 300 |
| `var(--acv-base-font-weight-regular)` | 400 |
| `var(--acv-base-font-weight-medium)` | 500 |
| `var(--acv-base-font-weight-semi-bold)` | 600 |
| `var(--acv-base-font-weight-bold)` | 700 |

### Line Height Variables

| Variable | Height |
|----------|--------|
| `var(--acv-base-font-line-height-16)` | 16px |
| `var(--acv-base-font-line-height-20)` | 20px |
| `var(--acv-base-font-line-height-24)` | 24px |
| `var(--acv-base-font-line-height-32)` | 32px |
| `var(--acv-base-font-line-height-40)` | 40px |

### Usage Examples

```css
/* Using CSS variables for typography */
.heading {
  font-family: var(--acv-base-font-family-inter);
  font-size: var(--acv-base-font-size-24);
  font-weight: var(--acv-base-font-weight-bold);
  line-height: var(--acv-base-font-line-height-32);
}

.body-text {
  font-size: var(--acv-base-font-size-14);
  font-weight: var(--acv-base-font-weight-regular);
  line-height: var(--acv-base-font-line-height-20);
}
```

### Tailwind Mapping (when using Tailwind classes)

| Tailwind | ui-syntax equivalent |
|----------|---------------------|
| `text-xs` | `var(--acv-base-font-size-12)` |
| `text-sm` | `var(--acv-base-font-size-14)` |
| `text-base` | `var(--acv-base-font-size-16)` |
| `text-lg` | `var(--acv-base-font-size-18)` |
| `text-xl` | `var(--acv-base-font-size-20)` |
| `text-2xl` | `var(--acv-base-font-size-24)` |
| `text-3xl` | `var(--acv-base-font-size-32)` |

---

## Color Usage Rules

### ⚠️ IMPORTANT: Always use `ui-syntax` CSS variables for colors

**NEVER use hardcoded hex colors** like `#3b82f6`, `#10b981`, `#ef4444` etc.

**ALWAYS use CSS variables** from the `@acronis-platform/ui-syntax` design system.

### Available Color Variables

#### Chart Colors (for data visualization)

| Variable | Usage | HSL Value |
|----------|-------|-----------|
| `var(--acv-color-chart-blue)` | Primary blue for charts | `hsl(215deg 68% 46%)` |
| `var(--acv-color-chart-green)` | Success, positive values | `hsl(177deg 91% 34%)` |
| `var(--acv-color-chart-purple)` | Secondary data series | `hsl(282deg 84% 71%)` |
| `var(--acv-color-chart-turquoise)` | Tertiary data series | `hsl(196deg 77% 51%)` |
| `var(--acv-color-chart-warning)` | Warning states, caution | `hsl(45deg 100% 51%)` |
| `var(--acv-color-chart-danger)` | Error, negative values | `hsl(0deg 81% 57%)` |
| `var(--acv-color-chart-critical)` | Critical states (orange) | `hsl(29deg 100% 53%)` |
| `var(--acv-color-chart-info)` | Informational | `hsl(214deg 80% 58%)` |
| `var(--acv-color-chart-violet)` | Alternative purple | `hsl(261deg 24% 47%)` |
| `var(--acv-color-chart-success)` | Success states | `hsl(75deg 68% 45%)` |
| `var(--acv-color-chart-yellow)` | Yellow accent | `hsl(48deg 77% 61%)` |
| `var(--acv-color-chart-brown)` | Brown accent | `hsl(30deg 51% 45%)` |
| `var(--acv-color-chart-red)` | Red accent | `hsl(0deg 84% 65%)` |
| `var(--acv-color-chart-light-blue)` | Light blue accent | `hsl(205deg 86% 75%)` |
| `var(--acv-color-chart-gray)` | Gray accent | `hsl(216deg 8% 61%)` |
| `var(--acv-color-chart-neutral)` | Neutral accent | `hsl(216deg 8% 88%)` |
| `var(--acv-color-chart-dark)` | Dark overlay | `hsl(215deg 30% 20% / 0.9)` |
| `var(--acv-color-chart-transparent)` | Transparent blue (⚠️ NOT for chart lines) | `hsl(205deg 86% 75% / 0.5)` |
| `var(--acv-color-cyan-base)` | Cyan accent | - |

> ⚠️ **Note:** `--acv-color-chart-transparent` and `--acv-color-chart-dark` should NOT be used for chart lines or data series. They are intended for overlays and backgrounds only.

#### Gray Colors (for UI elements)

| Variable | Usage |
|----------|-------|
| `var(--acv-color-gray-base)` | Default text, borders |
| `var(--acv-color-gray-light)` | Secondary text |
| `var(--acv-color-gray-lighter)` | Borders, dividers |
| `var(--acv-color-gray-darkest)` | Primary text |

### Usage Examples

#### ❌ Wrong (hardcoded hex)

```tsx
<Line stroke="#3b82f6" />
<Bar fill="#10b981" />
<p style={{ color: '#6b7280' }}>Text</p>
```

#### ✅ Correct (CSS variables)

```tsx
<Line stroke="var(--acv-color-chart-blue)" />
<Bar fill="var(--acv-color-chart-green)" />
<p style={{ color: 'var(--acv-color-gray-base)' }}>Text</p>
```

### Color Arrays for Charts

When defining color arrays for charts:

```tsx
// ❌ Wrong
const colors = ['#3b82f6', '#10b981', '#8b5cf6'];

// ✅ Correct
const colors = [
  'var(--acv-color-chart-blue)',
  'var(--acv-color-chart-green)',
  'var(--acv-color-chart-purple)',
];
```

### Common Hex to CSS Variable Mappings

| Hex Code | CSS Variable |
|----------|-------------|
| `#3b82f6` | `var(--acv-color-chart-blue)` |
| `#10b981` | `var(--acv-color-chart-green)` |
| `#8b5cf6` | `var(--acv-color-chart-purple)` |
| `#0ea5e9` | `var(--acv-color-chart-turquoise)` |
| `#f59e0b` | `var(--acv-color-chart-warning)` |
| `#ef4444` | `var(--acv-color-chart-danger)` |
| `#f97316` | `var(--acv-color-chart-critical)` |
| `#6366f1` | `var(--acv-color-chart-info)` |
| `#8884d8` | `var(--acv-color-chart-violet)` |
| `#22c55e` | `var(--acv-color-chart-success)` |
| `#eab308` | `var(--acv-color-chart-yellow)` |
| `#a16207` | `var(--acv-color-chart-brown)` |
| `#dc2626` | `var(--acv-color-chart-red)` |
| `#93c5fd` | `var(--acv-color-chart-light-blue)` |
| `#9ca3af` | `var(--acv-color-chart-gray)` |
| `#e5e7eb` | `var(--acv-color-chart-neutral)` |
| `#06b6d4` | `var(--acv-color-cyan-base)` |
| `#6b7280` | `var(--acv-color-gray-base)` |
| `#9CA3AF` | `var(--acv-color-gray-light)` |
| `#E5E7EB` | `var(--acv-color-gray-lighter)` |
| `#111827` | `var(--acv-color-gray-darkest)` |

### Reference

Full list of available variables can be found in:
`node_modules/@acronis-platform/ui-syntax/dist/css/globals.css`

## Why This Matters

1. **Consistency** - All colors follow the Acronis design system
2. **Theming** - Colors automatically adapt to light/dark themes
3. **Maintainability** - Single source of truth for colors
4. **Accessibility** - Design system colors are tested for contrast

---

## Commit Size Rules

### ⚠️ IMPORTANT: Limit commit size to 4000 LOC

**ALWAYS calculate Lines of Code (LOC) before committing and split large commits.**

#### Maximum commit size

- **Maximum LOC per commit: 4000 lines**
- Count LOC using `git diff --stat` or `git diff --shortstat`
- If a commit exceeds 4000 LOC, it MUST be split into smaller commits

#### Why limit commit size?

1. **Code review** - Easier to review smaller, focused changes
2. **Debugging** - Simpler to identify which commit introduced a bug
3. **Revert safety** - Less risky to revert smaller commits
4. **Clarity** - Each commit has a clear, single purpose
5. **CI/CD** - Faster build and test times per commit

#### Calculating LOC

```bash
# Check LOC for staged changes
git diff --cached --stat

# Check LOC for unstaged changes
git diff --stat

# Get total line count summary
git diff --cached --shortstat
```

#### Splitting large commits

If your changes exceed 4000 LOC:

1. **Group by feature/concern** - Split by logical boundaries (e.g., frontend/backend, feature A/feature B)
2. **Use interactive staging** - Stage files selectively:

   ```bash
   git add -p  # Interactive staging
   git add file1.ts file2.ts  # Stage specific files
   ```

3. **Commit incrementally** - Create multiple commits with clear messages:

   ```bash
   git commit -m "feat: add user authentication API"
   git commit -m "feat: add user authentication UI"
   git commit -m "test: add tests for user authentication"
   ```

4. **Keep commits atomic** - Each commit should be a complete, working change

#### Best practices

- **Plan ahead** - Consider commit boundaries before starting large changes
- **Commit frequently** - Don't wait until all work is done
- **Use branches** - Create feature branches for large changes
- **Review before committing** - Check `git diff --stat` before each commit
- **Document splits** - Reference related commits in commit messages when splitting

#### Example workflow

```bash
# Check total changes
git diff --cached --shortstat
# Output: 5234 files changed, 8932 insertions(+), 1245 deletions(-)

# Too large! Split into smaller commits
git reset

# Commit backend changes first
git add server/
git commit -m "feat: add authentication API endpoints"

# Commit frontend changes
git add src/components/auth/
git commit -m "feat: add authentication UI components"

# Commit tests
git add src/frontend/tests/unit
git commit -m "test: add authentication tests"
```

---

## Code Style Rules

### ⚠️ IMPORTANT: Always use braces for control statements

**NEVER use single-line control statements without braces.**

All `if`, `else`, `for`, `while`, and `do` statements MUST use braces `{}`, even for single-line bodies.

#### ❌ Wrong (no braces)

```typescript
if (account) activeUsers.add(account);

if (isValid) return true;

for (const item of items) processItem(item);

while (hasMore) fetchNext();
```

#### ✅ Correct (with braces)

```typescript
if (account) {
  activeUsers.add(account);
}

if (isValid) {
  return true;
}

for (const item of items) {
  processItem(item);
}

while (hasMore) {
  fetchNext();
}
```

#### Why braces are required?

1. **Readability** - Clear visual structure of code blocks
2. **Safety** - Prevents bugs when adding statements to control blocks
3. **Consistency** - Uniform code style across the codebase
4. **Debugging** - Easier to set breakpoints and trace execution

#### ESLint enforcement

This rule is enforced via ESLint `curly` rule configured as `["error", "all"]` in `.eslintrc.json`.

---

## TypeScript Type Rules

### ⚠️ IMPORTANT: Use enums instead of union types for string literals

**NEVER use union types for sets of predefined string values. ALWAYS use enums instead.**

This applies to any set of fixed string options: status types, filter types, metric types, categories, and any other categorical data.

#### ❌ Wrong (union types)

```typescript
type MetricType = 'average' | 'median' | 'total';
type AliasType = 'account' | 'email';
type Status = 'active' | 'inactive' | 'pending';
```

#### ✅ Correct (enums)

```typescript
export enum MetricType {
  Average = 'average',
  Median = 'median',
  Total = 'total',
}

export enum AliasType {
  Account = 'account',
  Email = 'email',
}

export enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
```

#### Why enums?

1. **Type safety** - Compiler catches invalid values at build time
2. **Refactoring** - Renaming a value updates all usages automatically
3. **Autocomplete** - IDE suggests valid values from the enum
4. **Prevents typos** - No risk of mistyping a string literal
5. **Centralized definition** - Single source of truth in the types file

#### Where to define enums

- Define enums in `src/types.ts` or dedicated type files under `src/types/`
- Export all enums so they can be imported across the codebase
- Use the enum members (e.g., `MetricType.Average`) instead of raw strings (`'average'`) everywhere in the code

---

## ESLint Disable Comments

### ⚠️ IMPORTANT: NEVER use eslint-disable comments

**AI agents and developers MUST NOT use `eslint-disable` comments under ANY circumstances.**

This includes:

- `// eslint-disable-next-line`
- `// eslint-disable`
- `/* eslint-disable */`
- `/* eslint-disable-next-line */`

#### Why?

1. **Code quality** - ESLint rules exist to maintain code quality and consistency
2. **Technical debt** - Disabling rules hides problems instead of fixing them
3. **Security** - Some rules prevent security vulnerabilities
4. **Maintainability** - Disabled rules make code harder to maintain

#### What to do instead

1. **Fix the underlying issue** - Refactor code to comply with the rule
2. **If the rule is wrong** - Discuss with the team and update `.eslintrc.json` globally
3. **If it's a false positive** - Report it and find a proper workaround

#### No exceptions

There are NO valid reasons for an AI agent to add `eslint-disable` comments. If ESLint reports an error, the correct action is to fix the code, not suppress the warning.

---

## Code Quality Tools

### Knip - Unused Code Detection

**Knip** is a comprehensive tool that finds unused files, dependencies, and exports in the codebase.

#### Running Knip

```bash
# Check for all unused code (files, dependencies, exports)
npm run knip

# Check only production dependencies
npm run knip:production
```

#### When to Run Knip

- **Pre-commit (automatic)** - Knip runs automatically on every commit via Husky hooks
- **During refactoring** - Identify code that can be safely removed
- **Before releases** - Clean up unused dependencies to reduce bundle size
- **Monthly maintenance** - Regular cleanup to prevent accumulation

#### What Knip Detects

1. **Unused files** - Source files not imported anywhere
2. **Unused dependencies** - Packages in `package.json` not used in code
3. **Unused exports** - Functions/classes exported but never imported
4. **Unused types** - TypeScript types/interfaces not referenced
5. **Duplicate exports** - Same export from multiple entry points

#### Handling False Positives

Knip may report false positives for:

- **Test utilities** - Used in tests but not detected
- **Config files** - Used by build tools
- **Dynamic imports** - Runtime imports not statically analyzed
- **Type-only imports** - TypeScript types used only in type annotations

**To ignore false positives**, add them to `.knip.json`:

```json
{
  "ignoreDependencies": [
    "package-name"
  ],
  "ignore": [
    "path/to/file.ts"
  ]
}
```

#### Best Practices

1. **Review before removing** - Always verify Knip findings before deleting code
2. **Check git history** - Ensure code isn't used in other branches
3. **Run tests** - Verify nothing breaks after cleanup
4. **Incremental cleanup** - Remove unused code in small batches
5. **Document exceptions** - Add comments explaining why code is kept despite Knip warnings

---

## Testing Rules

### Node.js version check

**Before running linter or tests, always verify the correct Node.js version is active:**

```bash
nvm use
```

This command reads the `.nvmrc` file and switches to the required Node.js version for the project.

**Always run `nvm use` before:**

- Running tests: `npm run test`, `npm run test:coverage`
- Running linter: `npm run lint -- --fix`
- Installing dependencies: `npm install`

This prevents version-related issues and ensures consistent behavior across environments.

### Test location and naming

- Place all test files under `src/frontend/tests/unit/`.
- The test path MUST mirror the tested file path under `src/`.
  - Example: `src/utils/formatting.ts` MUST be tested by `src/frontend/tests/unit/utils/formatting.test.ts`.
- For each source file under `src/`, create a separate test file under `src/frontend/tests/unit/`.
  - Do NOT put tests for multiple source files into a single test file.
- Shared test utilities (helpers, reusable mocks) MUST live under `src/frontend/tests/test-utils/`.

### Files that do NOT require tests

- **Type definition files** - Files containing only TypeScript types, interfaces, or type aliases
- **Enum files** - Files containing only enum declarations (enums should be tested through their usage in other components)
- **Constant files** - Files containing only constant declarations (constants should be tested through their usage in other components)
- **Re-export files** - Files that only import and re-export from other modules (e.g., `index.ts` files with only `export * from './module'` or `export { Component } from './Component'`)

#### Examples of files that do NOT need tests

```typescript
// ❌ No test needed - only types
export type User = {
  id: string;
  name: string;
};

// ❌ No test needed - only enums
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}

// ❌ No test needed - only constants
export const API_URL = 'https://api.example.com';
export const MAX_RETRIES = 3;

// ❌ No test needed - only re-exports
export { Component } from './Component';
export * from './utils';
```

### Skipped tests policy

**NEVER use `it.skip`, `test.skip`, or `describe.skip`** - these are forbidden.

**Use `it.todo` instead** when a test needs to be implemented later.

#### Rules

1. **Forbidden:** `it.skip(...)`, `test.skip(...)`, `describe.skip(...)`
2. **Allowed:** `it.todo('description')` - marks a test as pending implementation
3. **Required:** When adding `it.todo`, create an OpenSpec task to track the fix

#### Why?

- `skip` hides broken tests and technical debt
- `todo` explicitly marks tests as planned work
- OpenSpec tasks ensure `todo` tests are tracked and eventually implemented

#### ❌ Wrong

```typescript
it.skip('should handle edge case', () => {
  // This test is broken, skip for now
});

describe.skip('Feature X', () => {
  // Skip entire suite
});
```

#### ✅ Correct

```typescript
it.todo('should handle edge case');
// Task created in OpenSpec: fix-todo-tests
```

#### ESLint enforcement

These rules are enforced via ESLint:

- `jest/no-disabled-tests` - forbids `skip`
- `jest/no-focused-tests` - forbids `only`
- `testing-library/no-container` - forbids `container.querySelector`
- `testing-library/no-node-access` - forbids direct DOM node access
- `testing-library/prefer-screen-queries` - enforces `screen.getBy*` over destructured queries

### Test structure

- Prefer `beforeAll` for initialization that doesn't change between tests (e.g., setting up mock data that remains constant across all tests in a suite).
- Reuse mock setups and utilities across tests when possible to avoid duplication.
- Use `describe(...)` blocks to group related tests.
- Prefer `beforeEach` to reset state/mocks between tests.
- **Each `it(...)` block MUST contain exactly one `expect(...)` statement.**

#### Single Assertion Rule

The single-assertion rule improves test clarity, debugging, and coverage analysis:

1. **Clarity** - Each test has a single, clear purpose
2. **Debugging** - Failing tests pinpoint exactly what broke
3. **Coverage** - Coverage metrics accurately reflect what's tested
4. **Maintenance** - Easier to refactor and update tests

#### ❌ Wrong (Multiple Assertions)

```typescript
it('formats numbers correctly', () => {
  expect(formatNumber(0)).toBe('0');
  expect(formatNumber(999)).toBe('999');
  expect(formatNumber(1000)).toBe('1.0K');
  expect(formatNumber(1000000)).toBe('1.0M');
});
```

#### ✅ Correct (Single Assertion Per Test)

```typescript
it('formats zero correctly', () => {
  expect(formatNumber(0)).toBe('0');
});

it('formats numbers below 1k without suffix', () => {
  expect(formatNumber(999)).toBe('999');
});

it('formats numbers above 1k with K suffix', () => {
  expect(formatNumber(1000)).toBe('1.0K');
});

it('formats numbers above 1m with M suffix', () => {
  expect(formatNumber(1000000)).toBe('1.0M');
});
```

#### Multiple Assertions Exception

In rare cases, related assertions on the same object are acceptable if they test a single logical behavior:

```typescript
// Acceptable: Testing a single behavior (object creation)
it('creates user with correct properties', () => {
  const user = createUser('john@example.com');
  expect(user.email).toBe('john@example.com');
  expect(user.isActive).toBe(true);
  expect(user.role).toBe('user');
});
```

However, prefer splitting even these into separate tests when possible for better coverage granularity.

### Test isolation

- Changes in one test MUST NOT affect others.
- Reset mocks/timers and avoid shared mutable state.
- Tests MUST be deterministic and MUST NOT depend on wall-clock time, network availability, or local machine state.

### Type safety

- Use proper TypeScript types instead of `any`.
- Prefer type-safe assertions.

### React Testing Library best practices

- Prefer testing user-visible behavior and accessibility semantics over implementation details.
- Prefer accessible queries:
  - `screen.getByRole(...)`
  - `screen.getByLabelText(...)`
  - `screen.getByText(...)`
  - Use `within(...)` to scope queries.
- Avoid DOM selectors like `container.querySelector(...)`.
- Use `data-testid` only as a last resort (when no accessible query is suitable).
- Prefer `@testing-library/user-event` for interactions.
- For async UI, prefer `findBy*` and `waitFor`.
- **Avoid snapshot tests** — they are fragile and break on minor CSS/HTML changes. Prefer behavior tests that check specific elements, text, and interactions.

### Mocks

- Mock external dependencies.
- Tests MUST NOT perform real network calls.

### Assertions

- Prefer specific assertions (avoid `toBeTruthy` when a more explicit assertion is possible).
- Use `toHaveBeenCalled()` / `toHaveBeenCalledWith()` for function call verification.
- Use `toThrow()` / `rejects.toThrow()` for error cases.

### Performance

- Keep tests fast and focused.
- Mock expensive operations.
- Avoid unnecessary rerenders.
- **Maximum test execution time: 0.5 seconds (500ms) per test suite.**
  - This timeout is enforced in `jest.config.js` via `testTimeout: 500`.
  - If a test exceeds this limit, it will fail automatically.
  - Optimize slow tests by mocking heavy operations, reducing component complexity, or splitting into smaller test suites.

### Running tests during development

When writing or modifying tests, use the npm run test command to verify your test:

```bash
npm run test -- path/to/test.test.ts
```

This command runs a specific test file in isolation, which is faster and more focused than running the entire test suite.

#### Examples

```bash
# Run a specific test file
npm run test -- src/frontend/tests/unit/utils/formatting.test.ts

# Run tests for a component
npm run test -- src/frontend/tests/unit/components/Dashboard.test.tsx
```

### Linting during test development

**Always fix linting errors immediately** when writing or modifying tests:

```bash
npm run lint -- --fix
```

This ensures code quality and prevents lint errors from accumulating. Run this command after making changes to test files.

### Coverage thresholds

- Coverage is computed via `npm run test:coverage`.
- Coverage thresholds are configured in `jest.config.js` under `coverageThreshold`.
- CI and pre-commit MUST fail if coverage decreases below the configured thresholds.

#### Current coverage thresholds by directory

The `jest.config.js` file defines minimum coverage thresholds for different parts of the codebase:

| Directory | Branches | Functions | Lines | Statements |
|-----------|----------|-----------|-------|------------|
| **Global** | 39% | 47% | 55% | 55% |
| **`src/services/`** | 39% | 66% | 67% | 67% |
| **`src/utils/`** | 60% | 61% | 71% | 70% |
| **`src/hooks/`** | 77% | 93% | 93% | 92% |
| **`src/components/`** | 52% | 53% | 50% | 49% |

When adding tests, aim to meet or exceed these thresholds for the relevant directory.

#### Test timeout configuration

- **Default test timeout**: 500ms per test
- Configured in `jest.config.js` via `testTimeout: 500`
- Tests exceeding this limit will fail automatically
- **For tests requiring longer execution** (e.g., tests with intentional delays, slow async operations):
  - Add explicit timeout to individual tests: `it('test name', async () => { ... }, 10000);`
  - Common scenarios requiring longer timeouts:
    - Tests with `setTimeout` delays > 500ms
    - Tests waiting for multiple async operations
    - Tests with `waitFor` that need extended wait times
    - Integration tests with complex component interactions

### Coverage completion discipline

**When a task explicitly requires achieving coverage for a specific group or folder, you MUST NOT stop until full coverage is achieved.**

- If the task mentions "add tests for [folder/group]" or "achieve coverage for [component group]", continue writing tests until all files in that scope are covered.
- Do not stop after writing a few tests - verify coverage and continue until the target is met.
- Use `npm run test:coverage` to check current coverage levels.
- Systematically go through each file in the specified scope and ensure it has appropriate tests.

### Updating coverage thresholds after adding tests

**When adding significant test coverage, update the thresholds in `jest.config.js`:**

1. Run coverage to see current metrics: `npm run test:coverage`
2. Update the `coverageThreshold` section in `jest.config.js` to reflect the new coverage levels
3. Ensure thresholds match or slightly exceed actual coverage to prevent regressions

This ensures that:

- Coverage improvements are locked in and protected from regressions
- CI will fail if coverage drops below the new thresholds
- Coverage progress is properly tracked

### Module path mapping in tests

The project uses module path aliases for cleaner imports. These are configured in both `tsconfig.json` and `jest.config.js`:

#### Available path aliases

- `services/*` → `src/services/*`
- `utils/*` → `src/utils/*`
- `hooks/*` → `src/hooks/*`
- `context/*` → `src/context/*`
- `components/*` → `src/components/*`
- `types` → `src/types.ts` (direct import without subdirectory)
- `types/*` → `src/types/*` (for subdirectories if they exist)
- `views/*` → `src/views/*`
- `tests/unit/test-utils` → `src/frontend/tests/unit/test-utils/index.ts`

#### Usage in tests

```typescript
// ✅ Correct - using path aliases
import { formatNumber } from 'utils/formatting';
import { useAuth } from 'context/AuthContext';
import { Button } from 'components/Button';
import { User, Status } from 'types';
import { renderWithProviders } from 'tests/unit/test-utils';

// ❌ Wrong - using relative paths
import { formatNumber } from '../../../utils/formatting';
import { useAuth } from '../../../context/AuthContext';
```

#### Troubleshooting module resolution

If tests fail with "Cannot find module" errors:

1. Check that the path alias is defined in `jest.config.js` under `moduleNameMapper`
2. Verify the path points to the correct file/directory
3. For directories with `index.ts`, ensure the mapping points to the index file
4. Run `npm test` to verify the fix works

---

## ESLint Disable Usage Policy

### ⚠️ IMPORTANT: Minimize eslint-disable directives

**Avoid using `eslint-disable` directives. Fix the code instead.**

The project enforces a strict limit on `eslint-disable` usage through automated checks in the pre-commit hook.

### Rules for eslint-disable

1. **Prefer fixing the code** - Always try to fix the underlying issue rather than disabling the rule
2. **Specify exact rules** - Never use blanket `/* eslint-disable */` without rule names
3. **Use smallest scope** - Prefer `eslint-disable-next-line` over `eslint-disable-line` or file-level disables
4. **Add justification** - Include a comment explaining why the disable is necessary
5. **Temporary only** - Treat disables as technical debt to be removed

### Examples

```typescript
// ❌ Wrong - blanket disable
/* eslint-disable */

// ❌ Wrong - file-level disable without justification
/* eslint-disable @typescript-eslint/no-explicit-any */

// ❌ Wrong - no explanation
// eslint-disable-next-line react-hooks/exhaustive-deps

// ✅ Correct - specific rule, smallest scope, with justification
// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omitting `callback` to prevent infinite loop
useEffect(() => {
  callback();
}, []);
```

### Guardrail enforcement

The pre-commit hook runs `scripts/check-eslint-disables.sh` which:

- Counts all `eslint-disable*` directives in `src/`
- Compares against baseline in `scripts/eslint-disable-baseline.json`
- Fails the commit if count exceeds baseline

Current baseline: **0 directives allowed**

If you must add a disable:

1. Fix the code if possible
2. If truly necessary, add the disable with clear justification
3. Update the baseline file with a reason
4. Get the change reviewed
