# CVNest: Phase 4A completion report (GitHub release protection)

**Date:** 2026-11-05
**Scope:** require pull requests and passing CI on `main` through the existing `Protect main` ruleset (ID `26590341`), keeping its force-push and deletion protections.
**Approval:** the owner approved the exact configuration below before it was applied.
**Not changed:** application code, templates, storage, PDF, migrations, Cloudflare settings, Workers, deployment configuration, domains, branches and Git history. Nothing was merged or deployed.

---

## 1. Configuration before the change

From `gh api repos/adil-ramzan/cvnest/rulesets/26590341`:

| Setting | Value |
|---|---|
| Name, target, enforcement | `Protect main`, branch, active |
| Condition | `refs/heads/main` (no exclusions) |
| Rules | `non_fast_forward`, `deletion` |
| Pull requests required | No |
| Required status checks | None |
| Bypass actors | None (`current_user_can_bypass: never`) |

There are no other rulesets and no classic branch protection ("Branch not protected"). The repository allows merge commits, squash and rebase, with auto-merge off. `main` was `8141108`.

## 2. CI checks identified

There is one workflow, `.github/workflows/ci.yml` ("CI"), which runs on `push`, `pull_request` and `workflow_dispatch`. These are the real check-run names on `8141108` (`main`) and `7c03ff2` (`phase-3-deployment-data-safety`):

| Check run (exact name) | Reported by | Job | Covers | Required? |
|---|---|---|---|---|
| `Typecheck, lint, unit tests, build` | GitHub Actions (app id `15368`) | `checks` | `npm run typecheck`, `lint`, `test:unit`, `build` | **Yes** |
| `Browser suites (Chrome)` | GitHub Actions (`15368`) | `browser` (needs `checks`) | The standard browser suites | **Yes** |
| `PDF and pagination suites (Chrome and Firefox)` | GitHub Actions (`15368`) | `pdf` | Long PDF suites | No: runs only on a manual "full" run and is skipped on push and PR |
| `Workers Builds: cvnest` | Cloudflare (app id `85455`) | not CI | Cloudflare build | No: fails on every non-`main` branch and would block every PR |

**Durability suite:** it's in the browser job on `phase-3-deployment-data-safety` but not yet on `main`. The branch's run `42020447161` (`7c03ff2`) logged `✓ durability.test.mjs (16s)` and "All 20 browser suites passed". The job's check name doesn't change, so `durability` becomes enforced on every PR once that branch merges. A PR from that branch runs the branch's own workflow, so its PR is already tested with `durability`.

## 3. Configuration applied

Applied with `PUT /repos/adil-ramzan/cvnest/rulesets/26590341`, using exactly the approved payload:

```json
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "non_fast_forward" },
    { "type": "deletion" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash", "rebase"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "Typecheck, lint, unit tests, build", "integration_id": 15368 },
          { "context": "Browser suites (Chrome)", "integration_id": 15368 } ] } }
  ]
}
```

Choices:

- **0 approvals:** GitHub doesn't let you approve your own PR, so a higher number would block every merge in this solo repository.
- **All three merge methods:** same as the repository settings, so nothing new is restricted.
- **Strict up-to-date:** required, which works with the workflow because CI runs on `pull_request`.
- **Checks pinned to GitHub Actions:** a same-named check from another app can't satisfy the rule.

## 4. Verification

Ruleset updated at `2026-11-05T17:02:51.130+05:00`. A fresh `GET` of the ruleset and of `GET /repos/adil-ramzan/cvnest/rules/branches/main` (the rules GitHub actually enforces on `main`) both return:

| Check | Result |
|---|---|
| Enforcement | `active`, on `refs/heads/main` |
| `non_fast_forward` (force-push blocked) | Present |
| `deletion` (deletion blocked) | Present |
| `pull_request` | Present: `required_approving_review_count: 0`, all three merge methods |
| `required_status_checks` | Present: `Typecheck, lint, unit tests, build` and `Browser suites (Chrome)`, both `integration_id: 15368`; `strict_required_status_checks_policy: true`; `do_not_enforce_on_create: false` |
| Bypass actors | `[]`, `current_user_can_bypass: never` (applies to the owner too) |
| Effective rules on `main` | Exactly these 4 types, all from ruleset `26590341` |
| Other rulesets | None (1 ruleset in total) |
| `main` | Still `8141108`. No new check runs or Workers Builds on `main` after the change. |

**Fields GitHub added by default (not in the payload):**

- `required_reviewers: []` is empty, so it has no effect.
- `require_extra_approval_for_unattributed_changes: true` isn't in GitHub's public REST documentation. Its effect when 0 approvals are required is not verified. If the first real PR merge is blocked by an approval requirement, this field is the first thing to check.

**How "direct changes to `main` are blocked" was confirmed:** from the effective-rules endpoint, which shows the `pull_request` rule enforced on `main` with no bypass. A live direct push was **deliberately not attempted**. If protection had failed, that push would have landed on `main` and Workers Builds would have deployed it. The first real PR will give practical evidence: GitHub shows the required checks, and blocks merging until both pass and the branch is up to date.

## 5. Remaining release risks

- **No direct pushes, even by the owner.** An emergency fix needs a PR with green CI, or a deliberate ruleset edit.
- **The merge commit still deploys before its own CI run finishes.** Requiring up-to-date branches means its content is what CI tested on the PR.
- **PRs show a failing, non-required `Workers Builds: cvnest` check** until non-`main` builds are fixed or turned off in Cloudflare (Phase 3 report, section 2.3).
- **PDF and pagination suites aren't enforced.** They stay a manual release-checklist step for changes that touch PDF code.
- **Not covered by GitHub rules:** deploys from the Cloudflare dashboard, `wrangler deploy` from a terminal, and a Workers Builds build command that doesn't run tests. Phase 3 gate option 2 (tests in the build command) is still open.
- **`durability` isn't enforced on `main` until the Phase 3 branch merges.**

## 6. Production deployment

Not triggered. No commit reached `main`, and no merge, Cloudflare change or Worker change was made. This report is committed to the unmerged branch `phase-3-deployment-data-safety`. Pushing that branch starts a non-`main` Workers Build. Such builds have failed every time so far, and they can't change what `cvnest` serves.
