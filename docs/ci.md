# CI Pipeline Guide

## Overview

Broodly uses GitHub Actions for continuous integration. The pipeline runs on every push to `main` and every pull request targeting `main`.

## Pipeline Jobs

| Job | Trigger | Timeout | Purpose |
|---|---|---|---|
| **TypeScript** | Push + PR | 15 min | Format, lint, typecheck, test |
| **Go** | Push + PR | 15 min | Vet, lint, unit tests, coverage, migration guard, Docker build |
| **Go Integration** | Push + PR (after Go) | 15 min | Testcontainers integration tests |
| **Mobile Build** | Push to main only | 20 min | Inject secrets, build native configs |

## Running CI Locally

```bash
# Full CI check
./scripts/ci-local.sh

# TypeScript only
./scripts/ci-local.sh --skip-go

# Go only
./scripts/ci-local.sh --skip-ts

# Only changed packages
./scripts/test-changed.sh
```

## Quality Gates

- **Format:** Prettier check (all TS/JS/JSON/MD files)
- **Lint:** ESLint (TypeScript), golangci-lint (Go)
- **Type Check:** `tsc --noEmit` across all workspaces
- **GraphQL Staleness:** Generated types must match schema
- **Go Coverage:** Minimum 50% (enforced)
- **Migration Guard:** Sequential numbering, up/down pairs required
- **Docker Build:** API container must build successfully

## Required Secrets

Configure in GitHub Settings > Secrets and variables > Actions:

| Secret | Purpose | Required For |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key | Mobile Build |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Mobile Build |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Mobile Build |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Mobile Build |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender | Mobile Build |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Mobile Build |
| `EXPO_PUBLIC_API_URL` | GraphQL API URL | Mobile Build |
| `GOOGLE_SERVICES_JSON` | Base64-encoded Android config | Mobile Build (optional) |
| `GOOGLE_SERVICE_INFO_PLIST` | Base64-encoded iOS config | Mobile Build (optional) |

**Note:** TypeScript and Go test jobs use the Firebase Emulator — no real credentials needed for PR checks.

## Troubleshooting

**Tests pass locally but fail in CI:**
- Run `./scripts/ci-local.sh` to mirror CI environment
- Check that `EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true` is set

**GraphQL codegen staleness:**
- Run `pnpm --filter @broodly/graphql-types run codegen` and commit

**Migration guard fails:**
- Ensure migrations are numbered sequentially (000001, 000002, ...)
- Every `.up.sql` must have a matching `.down.sql`

**Go coverage below threshold:**
- Current threshold: 50%
- Run `go test -coverprofile=coverage.out ./...` and `go tool cover -html=coverage.out`
