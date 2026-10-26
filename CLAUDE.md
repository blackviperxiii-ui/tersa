# CLAUDE.md (tersa) — same rules as AGENTS.md

- **Flow:** branch from the latest `beta`, open every PR into `beta`, and squash-merge it yourself as soon as CI (`Node 20`, `Node 22`) is green. No review hold.
- **Gated:** promoting `beta` → `main`, tagging, and releasing need the maintainer's explicit approval. Never push to `main` or `beta` directly (ruleset: PRs only, CI green, no force-push or delete).
- **Ask only** when CI can't go green or for a product decision.
- **Cleanup:** head branches auto-delete on merge; delete your own scratch branches. Never delete `main` or `beta`.

## No personal info (hard rule)

This is open-source work meant for anyone to use. Keep every file, commit, PR and issue generic.

- Never include a real name, nickname used as a person, personal email, phone, address, employer, city, machine name, or real home-folder path. Where a name is needed, write "user". Paths use `/home/user`.
- Never mention the maintainer's other projects, personal bots or assistants, task boards, or personal workflow (Notion cards, Slack pings, approval habits). Examples use neutral names like `my-app`.
- Commits use the GitHub no-reply email. Squash merges use a clean subject and body with no `Co-authored-by` lines.
- `scripts/pii-guard/pii_guard.py` runs in CI as the required `pii-guard` check; run it locally before pushing.
