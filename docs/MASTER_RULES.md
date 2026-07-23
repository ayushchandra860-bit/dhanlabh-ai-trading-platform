# DhanLabh AI V2 - Master Rules

These are the master rules for the project. All contributions must adhere to these rules.

## Folder Rules

1.  All source code must reside within the designated top-level folders (`backend`, `frontend`, `electron`, `shared`, etc.).
2.  Each folder has a specific responsibility as defined in `ARCHITECTURE.md`. Do not place files in a folder that does not match its purpose.

## Naming Rules

1.  **Components (React):** `PascalCase` (e.g., `MyComponent.tsx`)
2.  **Files/Folders:** `kebab-case` or `snake_case` for Python, `camelCase` or `PascalCase` for TS/JS. Be consistent within each layer.
3.  **Variables/Functions:** `camelCase` in TypeScript/JavaScript, `snake_case` in Python.
4.  **Types/Interfaces:** `PascalCase` (e.g., `type MyType = ...`)

## Import Rules

1.  **No Circular Imports:** Circular dependencies are strictly forbidden.
2.  **Alias Usage:** Use path aliases (e.g., `@shared`) where configured to avoid deep relative paths (`../../../`).
3.  **Import Order:** Standard library imports first, then third-party imports, then internal application imports.

## Coding Rules

1.  Adhere to the configured linter rules (`ESLint` for TS/JS, a tool like `ruff` or `black` for Python).
2.  All new code should be accompanied by relevant tests.
3.  Write clear, commented code where the logic is complex.

## Phase Rules

1.  Development proceeds in clearly defined phases.
2.  Do not begin work on a new phase until the previous phase is complete and verified.
3.  Update `FEATURES.md` at the completion of each phase.

## Verification Rules

1.  Before committing, ensure the application builds and runs without errors.
2.  Verify that all checks (linting, testing) pass.

## No Root Source File Rule

1.  The project's root directory must ONLY contain configuration files (`package.json`, `vite.config.ts`, etc.), documentation (`README.md`), and license files.
2.  NO source code files (`.ts`, `.tsx`, `.py`, `.js`, `.css`) are allowed in the root directory.