# Repository Guidelines

## Project Structure & Module Organization
This repo uses a pnpm workspace with top-level subpackages in `packages/`. Package directories must follow `sdkwork-openchat-pc-xxx`, and package names must follow `@sdkwork/openchat-pc-xxx`.

- App shell: `src/` (app bootstrap, router, layout integration)
- Business modules: `packages/sdkwork-openchat-pc-*`
- Shared foundation: `packages/sdkwork-openchat-pc-commons`
- Package discovery: `pnpm-workspace.yaml`

`src/modules` is removed. New domain work must be added to packages, not reintroduced under `src/`.

## Build, Test, and Development Commands
- `pnpm run dev`: Start Vite in development mode
- `pnpm run dev:desktop`: Run Tauri desktop app
- `pnpm run build`: Type-check and production build
- `pnpm run typecheck`: Root type-check
- `pnpm run typecheck:packages`: Type-check all workspace packages
- `pnpm run sync:workspace-deps`: Auto-sync workspace deps from package public APIs
- `pnpm run verify:packages`: Validate package naming, entry points, and import boundaries
- `pnpm run scaffold:package -- <segment>`: Create a standard package (example: `pnpm run scaffold:package -- analytics`)

## Coding Style & Naming Conventions
Use strict TypeScript and React function components. Keep package public API in `src/index.ts`. Internal files can evolve, but only exported entry APIs are contract-stable.

- Package folder: `sdkwork-openchat-pc-xxx`
- Package name: `@sdkwork/openchat-pc-xxx`
- Component files: PascalCase (`ChatPage.tsx`)
- Hooks/utilities: camelCase (`useAuth.ts`)

In `packages/`, forbidden imports are:
- `@/...`
- direct imports into another package’s `/src/...`

Use package imports instead (for example, `@sdkwork/openchat-pc-commons`).

## Testing Guidelines
Use Vitest (`jsdom`) for unit/component tests. Keep test names `*.test.ts(x)` or `*.spec.ts(x)`. Run `pnpm run test` before PRs, and include package type-check evidence (`pnpm run typecheck:packages`).

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat(scope): summary`, `fix(scope): summary`). For PRs, include:
- What changed and why
- Impacted packages
- Validation commands run (typecheck/test/lint)
- UI screenshots when relevant
