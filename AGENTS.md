# AGENTS.md

## Repository overview

This repository is a Bun-managed Nx monorepo for the Power Market Dashboard. It currently contains:

- `apps/web`: Angular 22 standalone application with SSR and hydration.
- `apps/api`: NestJS 11 HTTP API. Routes are served below `/api`.
- `apps/importer`: NestJS 11 application intended for data-import work.
- `apps/web-e2e`: Playwright end-to-end tests for the web application.
- `apps/api-e2e` and `apps/importer-e2e`: Jest end-to-end tests for the NestJS applications.

Keep application-specific code inside its owning project. Put genuinely shared code in an Nx library rather than importing directly between application folders.

## Tooling and commands

Use Bun and the checked-in `bun.lock`. Do not create npm, pnpm, or Yarn lockfiles.

```sh
bun install
bun nx show projects
bun nx show project <project-name>
```

Common development commands:

```sh
bun nx serve web
bun nx serve api
bun nx serve importer
```

The API and importer both default to port `3000`; set `PORT` when running them simultaneously.

Run the narrowest checks that cover a change:

```sh
bun nx lint <project-name>
bun nx test web
bun nx build <project-name>
bun nx e2e web-e2e
bun nx e2e api-e2e
bun nx e2e importer-e2e
```

For cross-project changes, use Nx to run checks across affected projects:

```sh
bun nx affected -t lint test build
```

Before handing off a code change, run lint and the relevant tests. Also run the relevant production build for changes to application code, build configuration, SSR behavior, or dependencies. Report any check that could not be run and why.

## TypeScript and formatting

- Follow `.editorconfig`: UTF-8, two-space indentation, final newline, and no trailing whitespace.
- Preserve the repository's single-quote TypeScript style.
- Keep TypeScript strict and avoid `any`; model external data explicitly and validate it at system boundaries.
- Prefer small, focused modules and descriptive names over comments that restate the code.
- Do not edit generated output in `dist/`, Nx state in `.nx/`, Angular cache data in `.angular/`, or dependencies in `node_modules/`.
- Use Nx generators when adding projects or libraries. Inspect generator options before running a generator, and keep generated changes scoped to the requested work.

## Angular application

- Use standalone components and the existing Angular 22 conventions; do not introduce NgModules for feature code.
- Prefer signals for local and derived state, signal-based inputs/outputs where appropriate, and built-in template control flow (`@if`, `@for`, and `@switch`).
- Keep components focused on presentation and interaction. Put reusable business logic and data access in injectable services.
- Prefer `inject()` for new dependency injection code and `ChangeDetectionStrategy.OnPush` for new components unless there is a concrete reason not to.
- Keep routes in `app.routes.ts` or feature route files. Lazy-load substantial features.
- The web app is server-rendered. Do not access `window`, `document`, browser storage, or browser-only APIs during server rendering without a platform-safe guard or browser-only lifecycle boundary.
- Preserve hydration support in `app.config.ts` and avoid nondeterministic initial markup that can cause hydration mismatches.
- Build accessible semantic HTML first. Ensure keyboard access, visible focus, form labels, and meaningful names for interactive controls.
- Keep component styles local; reserve `apps/web/src/styles.css` for true global styles.
- Add or update nearby `*.spec.ts` tests for changed component behavior and services.

## NestJS applications

- Keep transport concerns in controllers, business logic in services, and dependency wiring in modules.
- Use DTOs and validation for external input rather than accepting untyped request bodies.
- Throw NestJS HTTP exceptions for expected client-facing failures; do not expose internal errors or secrets.
- Keep the `api` and `importer` responsibilities separate. Extract shared contracts or logic to a library when both applications need them.
- Read configuration from the environment. Never commit credentials, tokens, or machine-specific values.
- Add unit tests beside nontrivial code and update the corresponding e2e project when changing public HTTP behavior.

## Testing guidance

- Test observable behavior, not implementation details.
- Angular unit tests use the Angular test builder with Vitest. Use `TestBed` only when Angular integration is needed.
- Web end-to-end tests use Playwright and belong in `apps/web-e2e/src`.
- NestJS end-to-end tests use Jest and belong in their matching `*-e2e` project.
- Keep tests deterministic: do not rely on execution order, real external services, arbitrary sleeps, or undeclared local state.
- A bug fix should include a regression test when practical.

## Change discipline

- Inspect the affected project configuration before changing dependencies, targets, ports, or output paths.
- Keep changes focused; do not reformat or rewrite unrelated files.
- Preserve user changes already present in the working tree.
- Update documentation when commands, configuration, environment variables, routes, or public behavior change.
- Do not commit changes unless explicitly asked.
