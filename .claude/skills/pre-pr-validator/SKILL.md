---
name: pre-pr-validator
description: Use before creating a PR, pushing final changes, or claiming implementation is complete. Runs TypeScript build and Vitest tests, reports evidence-based pass/fail before proceeding.
---

# Pre-PR Validator

## Trigger
Run this skill before:
- Creating a PR (`gh pr create`)
- Pushing a final branch
- Claiming "implementation complete" or "ready to merge"

## Steps

### 1. TypeScript check via build
```bash
npm run build
```
- Exit 0 → pass
- Any error → fail; report exact file + error line before continuing

### 2. Unit tests
```bash
npm test
```
- All Vitest tests must pass (currently covers `lib/calculations/`)
- Report: X/X passed, or list failures

### 3. Evidence report
State both results explicitly before any success claim:
```
Build:  ✅ exit 0  / ❌ [error summary]
Tests:  ✅ X/X     / ❌ [failure list]
```

## Rules
- Run both commands in THIS message — previous runs don't count
- If either fails: fix, re-run, then proceed
- Do not create the PR until both are green
- Skip this skill only if the change is Vault-only (no source files touched)
