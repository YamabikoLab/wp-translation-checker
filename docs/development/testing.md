# Testing and validation

Run application commands from the repository root. Use the narrowest relevant checks while working, then run the applicable checks before handoff.

Read [`test-guidelines.md`](./test-guidelines.md) before creating or changing automated tests.

## Install dependencies

Install the locked npm dependencies with:

```bash
npm ci
```

This is environment setup rather than a source validation check.

## Current validation commands

The current `package.json` provides these non-interactive validation commands:

```bash
npm run format:check
npm run lint
npm test
npm run test:coverage
npm run build
npm run validate
npm run audit
npm run knip
```

Glossary の静的データを公式ページから明示的に再生成する開発コマンド:

```bash
npm run glossary:update
```

- `npm run format:check` checks repository formatting with Prettier.
- `npm run lint` runs ESLint across the repository.
- `npm test` runs the Vitest suite once with `vitest run`.
- `npm run test:coverage` runs the Vitest suite with V8 coverage and writes text and HTML reports. Statements, Branches, Functions, and Lines must each remain at or above 80%.
- `npm run build` runs the TypeScript build and creates the Vite production bundle.
- `npm run validate` runs the full application validation sequence in this order: formatting, linting, tests, then build. Coverage remains separate so the normal completion check and local test loop do not pay the coverage cost.
- `npm run audit` checks npm dependencies and fails when npm reports a high or critical vulnerability.
- `npm run knip` checks for unused files, dependencies, and exports.
- `npm run glossary:update` fetches the official Japanese WordPress.org Glossary and regenerates the committed static data. It is a maintenance command, not a validation check.
- The build writes generated output under `dist/`; do not commit it.
- Coverage HTML output is generated under `coverage/`; do not commit it.

Use `npm run validate` as the repository-wide application completion check when all application validation steps apply. PR Validation runs automatically for pull requests and runs `npm run validate`, `npm run test:coverage`, `npm run audit`, and Knip. For manual `workflow_dispatch` runs, Knip is enabled by default and can still be disabled with the `run_knip` input. Keep `npm test` scoped to Vitest so automated tests can be run independently from formatting, linting, build validation, and coverage reporting.

Check changed lines for whitespace errors with:

```bash
git diff --check origin/main...HEAD
```

Vitest uses its Node environment by default. Add a DOM environment or React DOM test utilities only when a React integration responsibility requires them.

Coverage includes product TypeScript and TSX under `src/`. Test files, declaration files, and the thin application bootstrap `src/main.tsx` are excluded because they do not own product behavior that benefits from coverage measurement. Do not expand coverage exclusions to satisfy the threshold.

## Security validation

Gitleaks runs in GitHub Actions as a dedicated security workflow for pull requests, pushes to `main`, and manual runs. It scans the full Git history with the standard Gitleaks rules and redacts detected secret values from logs.

Dependency vulnerability checks use `npm run audit` and run as part of PR Validation. Gitleaks remains separate because it scans repository history for secrets rather than npm dependency vulnerabilities.

Gitleaks is not an npm validation command and is not required as a local development dependency.

## Development commands

These commands are useful for development but are not completion checks:

```bash
npm run dev
npm run preview
```

They are long-running or interactive and should not be treated as handoff validation.

## Which checks to run

- Documentation-only changes: `git diff --check origin/main...HEAD`.
- JavaScript, TypeScript, JSX, TSX, test, or configuration changes that affect application compilation: `npm run validate`, `npm run test:coverage`, and the repository check.
- Dependency manifest or lock-file changes: run `npm run validate`, `npm run test:coverage`, `npm run audit`, and `npm run knip` after `npm ci`, and keep `package.json` and `package-lock.json` aligned.
- GitHub Actions workflow changes: review the final workflow diff and run `git diff --check origin/main...HEAD`.
- Mixed changes: combine the applicable groups.

Use only checks that exist in the current repository. When `package.json` scripts or validation tooling change, update this document in the same change.

Do not claim a check was run when it was skipped or unavailable. State the reason when an applicable check could not be executed.
