#!/bin/bash
# test-changed.sh — Run tests only for packages with changed files.
# Usage: ./scripts/test-changed.sh
set -euo pipefail

CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached)

run_ts=false
run_go=false

while IFS= read -r file; do
  case "$file" in
    apps/mobile/*|packages/*) run_ts=true ;;
    apps/api/*) run_go=true ;;
  esac
done <<< "$CHANGED_FILES"

if [ "$run_ts" = true ]; then
  echo "--- Running TypeScript tests (changed files detected) ---"
  EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true pnpm run test
fi

if [ "$run_go" = true ]; then
  echo "--- Running Go tests (changed files detected) ---"
  (cd apps/api && go test -short -race ./...)
fi

if [ "$run_ts" = false ] && [ "$run_go" = false ]; then
  echo "No testable files changed."
fi
