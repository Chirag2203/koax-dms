---
name: review
description: Review a diff or PR against an approved spec
---

# /review — independent code review

## Arguments
- `$SPEC_PATH` — the approved spec the diff implements
- `$DIFF_REF` — git ref, PR URL, or path

## Steps
1. Launch `code-reviewer` with spec + diff.
2. If `BLOCK`, list blockers with file:line references.
3. Optionally launch `security-reviewer` and/or `finance-reviewer` for a second opinion on their domains.

## Output
- Verdict, blockers, must-fixes, nits, praise.
