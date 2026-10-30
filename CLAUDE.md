# CLAUDE.md (tersa) — same rules as AGENTS.md

- **Flow:** branch from the latest `beta`, open every PR into `beta`, and squash-merge it yourself as soon as CI (`Node 20`, `Node 22`) is green. No review hold.
- **Gated:** promoting `beta` → `main`, tagging, and releasing need the maintainer's explicit approval. Never push to `main` or `beta` directly (ruleset: PRs only, CI green, no force-push or delete).
- **Ask only** when CI can't go green or for a product decision.
- **Cleanup:** head branches auto-delete on merge; delete your own scratch branches. Never delete `main` or `beta`.

## Require vstack

Coding agents working on this repo use the [vstack](https://github.com/blackviperxiii-ui/vstack) skills; start with `viper-mode`. Do not copy vstack skills or rules into this repository.

- Claude Code: `.claude/settings.json` adds the vstack marketplace and turns on `vstack@vstack`, so it loads once you trust the folder. If `/plugin` doesn't list it, run `/plugin marketplace add blackviperxiii-ui/vstack` and `/plugin install vstack@vstack`.
- Cursor: import `blackviperxiii-ui/vstack` as a team marketplace; set it to Required and enable Auto Refresh.
- Other agents (Codex, Copilot, Jules): run `npx skills add blackviperxiii-ui/vstack -g -y` before you start, so the skills install for your user and nothing lands in the repo.

How to use vstack here:

- Start nontrivial work with `viper-mode`. It routes to `how` and `why` before edits, `architect` for new modules, `blast-radius` before shared code, `tdd` for bugs and `interrogate` for reviews.
- Issues and board cards: run `follow-through` from pickup to PR (start comment, blocked note, done with proof).
- PR bodies and docs: `technical-writing`.
- All TypeScript in `packages/`: `typescript-best-practices`. Before a beta to main promotion: `qa-walkthrough`.
- No install? Read a skill straight from `https://github.com/blackviperxiii-ui/vstack/blob/main/skills/<name>/SKILL.md`.

## No personal info (hard rule)

This is open-source work meant for anyone to use. Keep every file, commit, PR and issue generic.

- Never include a real name, nickname used as a person, personal email, phone, address, employer, city, machine name, or real home-folder path. Where a name is needed, write "user". Paths use `/home/user`.
- Never mention the maintainer's other projects, personal bots or assistants, task boards, or personal workflow (Notion cards, Slack pings, approval habits). Examples use neutral names like `my-app`.
- Commits use the GitHub no-reply email. Squash merges use a clean subject and body with no `Co-authored-by` lines.
- `scripts/pii-guard/pii_guard.py` runs in CI as the required `pii-guard` check; run it locally before pushing.
