# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the NestJS backend. Shared infrastructure lives in `src/common/`, websocket transport in `src/gateways/`, optional integrations in `src/extensions/`, and business domains in `src/modules/*` such as `message`, `group`, `rtc`, and `agent`. Unit tests are usually colocated as `*.spec.ts` under `src/`; end-to-end tests live in `test/`. Database baseline SQL and incremental patches live in `database/`, operational scripts in `scripts/`, and long-form docs in `docs/`. Treat `dist/` and `var/` as generated output.

## Build, Test, and Development Commands
Use the root Node workflow; CI installs and runs the backend with `npm`.

- `npm ci` installs exact root dependencies.
- `npm run start:dev` starts the server in watch mode.
- `npm run build` compiles the app to `dist/`.
- `npm run lint` runs the lint pipeline; `npm run lint:types` runs `tsc --noEmit`.
- `npm run test`, `npm run test:cov`, and `npm run test:e2e` run unit, coverage, and e2e suites.
- `./scripts/init-database.sh development` initializes a fresh local database.
- `./scripts/apply-db-patches.sh production` applies incremental SQL patches from `database/patches/`.
- `make dev` and `make prod` wrap Docker-based environments when local services are not available.

## Coding Style & Naming Conventions
Write TypeScript in standard NestJS style: small focused modules/services/controllers, grouped imports, and 2-space indentation as formatted by Prettier. Use `kebab-case` filenames such as `agent.service.ts`, PascalCase for classes, DTOs, and entities, and camelCase for methods and variables. Prefer the `@/*` alias for imports from `src/`. ESLint forbids `var`, prefers `const`, flags unused parameters unless they start with `_`, and only allows `any` sparingly.

## Testing Guidelines
Jest is the test runner for both unit and e2e coverage. Place unit tests beside the code they verify as `*.spec.ts`; keep e2e tests in `test/*.e2e-spec.ts`. `npm run test:cov` enforces the current global minimum of 50% for branches, functions, lines, and statements. Add or update tests with every behavior change, especially around messaging, RTC, auth, and database patch flows.

## Commit & Pull Request Guidelines
Recent history mostly follows Conventional Commit style such as `feat(agent): ...` and `fix(router): ...`; prefer `type(scope): imperative summary` for new commits. Keep each commit scoped to one concern. Pull requests should follow [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md): include a clear description, linked issue, change type, test evidence, relevant Node/PostgreSQL/Redis versions, screenshots when UI behavior changes, and an explicit migration note for breaking changes.
