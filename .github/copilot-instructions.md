# Copilot Instructions — broodly

> **Note:** This file applies to the `combsmith/broodly` repository only. Org-wide Copilot
> rules are in [`combsmith/.github/copilot-instructions.md`](https://github.com/combsmith/.github/blob/main/copilot-instructions.md).
> Comprehensive agent/AI coding standards (including TDD, architecture, and BMAD workflow) are
> in [`combsmith/.github/AGENTS.md`](https://github.com/combsmith/.github/blob/main/AGENTS.md).
> This file covers only what is specific to broodly.

## About

Broodly is a field-first beekeeping decision-support app — a pnpm monorepo with an Expo React Native mobile frontend and a Go backend, helping beekeepers make data-driven hive management decisions.

## Tech Stack

- **Runtime:** Node.js ≥ 20 (mobile/packages) · Go 1.24 / toolchain go1.26.6 (API)
- **Framework:** Expo SDK 55 · React Native 0.83 · React 19 · Gluestack UI v3 · NativeWind v4
- **Testing:** Jest with jest-expo preset (mobile) · React Testing Library for Native · `go test ./...` (API)
- **Linting:** ESLint ^10 + Prettier ^3 (root workspace) · `golangci-lint` (Go)
- **Key libraries:** `@gluestack-ui/core` ^3, `nativewind` ^4, `react-native-reanimated` ^4, `go-chi/chi` v5, TypeScript ~5.9.3

## Project Structure

```text
apps/
  mobile/              # Expo React Native app (Expo SDK 55, jest-expo)
  api/                 # Go backend (go.mod: github.com/broodly/api, chi router)
packages/
  config/              # Shared ESLint / TypeScript config
  domain-types/        # Shared TypeScript domain types
  graphql-types/       # @graphql-codegen generated types (never edit directly)
  test-utils/          # Shared test helpers
  ui/                  # Shared UI components (note: Gluestack-generated components currently
                       #   live in apps/mobile/components/ui — add react/react-native/gluestack
                       #   deps to this package before moving components here)
```

## Local Dev Commands

- Install: `pnpm install`
- Test (JS/TS): `pnpm test`
- Test (Go API): `cd apps/api && go test ./...`
- Lint (JS/TS): `pnpm lint`
- Lint (Go API): `cd apps/api && golangci-lint run`
- Typecheck: `pnpm typecheck`
- Mobile dev: `pnpm --filter mobile start`
- API dev: `cd apps/api && go run ./cmd/server`

## Environment Variables (API server)

These are required when running the Go API server locally; they are not needed for JS/TS
package development or mobile-only work:

- `FIREBASE_PROJECT_ID`: GCP Firebase project ID
- `DATABASE_URL`: PostgreSQL connection string (Cloud SQL proxy for local dev; matches the Cloud Run secret binding)

## Testing Framework

- Mobile runner: Jest with jest-expo preset; React Testing Library (`@testing-library/react-native`)
- API runner: `cd apps/api && go test ./...` with `golangci-lint run`
- Coverage thresholds: defined per-package (see each package's `jest.config.js`; mobile config is in `apps/mobile/package.json`)
- Mutation testing: not configured

## Repo-Specific Overrides

**pnpm workspace** — always run commands from the monorepo root using `pnpm -r` or `pnpm --filter <package>`. Do not `cd` into packages and run `npm` directly.

**Cross-package imports** — use workspace package names (`@broodly/domain-types`, `@broodly/ui`) declared in `package.json` workspaces; never use relative paths across package boundaries.

**Go module** — the API module is `github.com/broodly/api` with toolchain pinned to go1.26.6 for crypto/tls, crypto/x509, net, net/textproto, and encoding/asn1 stdlib security fixes; the `go` directive stays at 1.24.

## Org Standards

See [combsmith/.github — AGENTS.md](https://github.com/combsmith/.github/blob/main/AGENTS.md) for org-wide agent/AI coding standards (TDD, architecture, BMAD workflow).
See [combsmith/.github/copilot-instructions.md](https://github.com/combsmith/.github/blob/main/copilot-instructions.md) for org-wide Copilot instructions.

**Language-specific instructions** (applied automatically by Copilot when you open matching file types):

- [TypeScript / TSX](.github/instructions/typescript.instructions.md) — strict config, branded types, DDD/CQRS patterns, React Native (`testID`)
- [JavaScript](.github/instructions/javascript.instructions.md) — style, JSDoc type annotations, error handling
- [Go](.github/instructions/go.instructions.md) — naming, gofmt, slog logging, error wrapping, concurrency, testing
