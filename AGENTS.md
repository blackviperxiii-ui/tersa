# Agent rules (tersa)

- **Flow:** branch from the latest `beta`, open every PR into `beta`, and squash-merge it yourself as soon as CI (`Node 20`, `Node 22`) is green. No review hold (user, 2026-10-24).
- **Gated:** promoting `beta` → `main`, tagging, and releasing need user's explicit say. Never push to `main` or `beta` directly (ruleset: PRs only, CI green, no force-push or delete).
- **Ask only** when CI can't go green or for a product decision.
- **Cleanup:** head branches auto-delete on merge; delete your own scratch branches. Never delete `main` or `beta`.

## No personal info (hard rule)

Never put a real name, personal email, phone, address, employer, or real home-folder path in any file, commit message, PR, or issue. Anywhere a name is needed, write "user". Paths use `/home/user`. Commits use the GitHub no-reply email. `scripts/pii-guard/pii_guard.py` runs in CI (`pii-guard` check) and blocks violations; run it locally before pushing.
