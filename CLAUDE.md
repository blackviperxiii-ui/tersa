# CLAUDE.md (tersa) — same rules as AGENTS.md

- **Flow:** branch from the latest `beta`, open every PR into `beta`, and squash-merge it yourself as soon as CI (`Node 20`, `Node 22`) is green. No review hold (Viper, 2026-10-24).
- **Gated:** promoting `beta` → `main`, tagging, and releasing need Viper's explicit say. Never push to `main` or `beta` directly (ruleset: PRs only, CI green, no force-push or delete).
- **Ask only** when CI can't go green or for a product decision.
- **Cleanup:** head branches auto-delete on merge; delete your own scratch branches. Never delete `main` or `beta`.
- **Skills:** use pstack skills; vstack is retired.
