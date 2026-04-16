---
name: build
description: Implement an approved spec via coder → code-reviewer
---

# /build — implement an approved spec

## Arguments
- `$SPEC_PATH` — path to an approved spec file (e.g., `/specs/modules/inventory/01-vehicle-listing.md`)

## Preconditions
- Spec status is `approved`.
- All wave-2 verdicts at least `APPROVE-WITH-CONDITIONS`.

## Steps
1. Launch `coder` with the spec path. Coder produces the diff and build report.
2. Launch `code-reviewer` with the diff + spec.
3. If `code-reviewer` returns `BLOCK`, loop back to `coder` with the blockers.
4. If `APPROVE-WITH-NITS`, apply nits then mark DoD complete.
5. Set spec status to `in-build` → `shipped` after merge.

## Output
- Diff + build report + review report.
