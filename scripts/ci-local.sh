#!/bin/bash
# ci-local.sh — Run the CI pipeline locally to catch issues before pushing.
# Usage: ./scripts/ci-local.sh [--skip-go] [--skip-ts]
set -euo pipefail

SKIP_GO=false
SKIP_TS=false

for arg in "$@"; do
  case $arg in
    --skip-go) SKIP_GO=true ;;
    --skip-ts) SKIP_TS=true ;;
  esac
done

echo "=== Broodly CI (local) ==="

if [ "$SKIP_TS" = false ]; then
  echo ""
  echo "--- TypeScript: format check ---"
  pnpm -w run format:check

  echo ""
  echo "--- TypeScript: lint ---"
  pnpm run lint

  echo ""
  echo "--- TypeScript: typecheck ---"
  pnpm run typecheck

  echo ""
  echo "--- TypeScript: test ---"
  EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true \
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=broodly-dev \
  pnpm run test
fi

if [ "$SKIP_GO" = false ]; then
  echo ""
  echo "--- Go: vet ---"
  (cd apps/api && go vet ./...)

  echo ""
  echo "--- Go: test ---"
  (cd apps/api && go test -short -race ./...)

  echo ""
  echo "--- Go: migration guard ---"
  (cd apps/api && ls migrations/*.sql >/dev/null 2>&1 && echo "Migrations present — run CI for full guard" || echo "No migrations")
fi

echo ""
echo "=== CI local checks passed ==="
