# CI policy

Which workflow jobs run on which event, and the rules every workflow change keeps. Update this file in the same PR as any workflow change.

All jobs run on Linux (`ubuntu-latest`). There are no Windows or macOS jobs, no release workflow and no uploaded artifacts.

## Run-on and skip-on

| Event                                             | Runs                                                                                                                            | Skips                                                                                                                                              | Cancelled by a newer run?   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Pull request to `beta` or `main`                  | `ci.yml`: `format` (Prettier) and `lint-test` (ESLint, typecheck, test, build on Node 22). `pii-guard.yml`: `pii-guard`.        | `lint-test` when only `docs/` or Markdown files change (a skipped check still reports as passed). The Node 20/22 matrix and `pnpm verify:example`. | Yes                         |
| Push to `beta`                                    | `format`, `lint-test`, `full (Node 20)` and `full (Node 22)` (lint, typecheck, test, build, `pnpm verify:example`), `pii-guard` | Nothing                                                                                                                                            | Yes, a newer push to `beta` |
| Push to `main`                                    | Same as a push to `beta`                                                                                                        | Nothing                                                                                                                                            | No                          |
| Merge queue                                       | `format`, `lint-test`, `pii-guard`                                                                                              | The Node 20/22 matrix                                                                                                                              | No                          |
| Nightly, 08:35 UTC on the default branch (`beta`) | `format`, `lint-test`, the Node 20/22 matrix                                                                                    | `lint-test` and the matrix when the commit already passed a push, nightly or manual CI run                                                         | No                          |
| Manual CI run                                     | `format`, `lint-test`, the Node 20/22 matrix                                                                                    | Nothing                                                                                                                                            | No                          |
| Issue label or `@claude` comment by the owner     | `claude.yml`                                                                                                                    | Everyone else's events                                                                                                                             | No                          |

Required checks on `beta`: `format`, `lint-test`, `pii-guard`.

## Rules

- Every job sets `timeout-minutes`, sized at a few times its usual run time.
- Uploaded artifacts that aren't release assets keep `retention-days: 7` or less.
- Heavy work (the Node version matrix, the generated example build) never runs on pull requests.
- Path gating uses a job-level `if:` on the `changes` job's outputs, never a workflow-level path filter, so skipped required checks still report.
- `format` doesn't depend on `changes`, so a failed `changes` job can't turn it into a skipped (passing) required check.
