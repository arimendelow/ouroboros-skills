# Task 7 report

Status: DONE

## Base and head SHAs

- Base: `476c182f242cca6ad3e85028b33a8c540e914fec`
- Head: `e1fe024d81d65ffd5f498b97acd85daf03520f31`
- Pinned Desk candidate: `4aa49182ce6352d6fcdc60b6b21f6eced5a24a0b`

## Changed files

- `README.md`
- `plugins/ms-desk/agency.json`
- `plugins/ms-desk/agents/worker.md`
- `plugins/ms-desk/plugin.json`
- `scripts/installed-composition-smoke.mjs`
- `scripts/v2-alpha-ms-closure.test.mjs`
- `scripts/worker-startup-composition.test.mjs`
- `scripts/worker-startup-policy.test.mjs`

## Result

MS Desk `2.29.5` now consumes the inherited Desk and Superpowers foundations without copying their generic lifecycle prose while retaining the selected-consumer admission that no pinned lower layer owns. The installed smoke proves the six engine-loaded roots, exact skill providers, loaded-byte readability, connected Desk and Approvals MCPs, a successful real `desk_status` invocation, and zero copies of the removed generic passages.

## Commits

- `3974279a52891103bcf2fcf422212b1dc1adaa29` — `refactor: consume inherited startup foundations`
- `1f774efc5986bee0cc8b28c79b3fbdbed76d6c01` — `fix: retain MS startup admission`
- `a2ffde8689f8aab4582f2fb2e696c153eef33265` — `fix: stabilize installed composition proof`
- `e1fe024d81d65ffd5f498b97acd85daf03520f31` — `fix: bind composition proof to requested session`

## Validation

The exact-head installed smoke passed against MS Desk `e1fe024d81d65ffd5f498b97acd85daf03520f31` and Desk `4aa49182ce6352d6fcdc60b6b21f6eced5a24a0b`. It observed `crew@0.2.0`, `desk@3.2.0-alpha.7`, `ms-desk@2.29.5`, `plain-language@0.2.1`, `superpowers@6.3.0`, and `teams-approvals@1.0.0-rc.6`; assigned `using-ms-desk` to MS Desk, `using-desk` to Desk, `using-superpowers` to Superpowers, and `decide-in-teams` to Teams Approvals; reported Desk and Approvals as connected; completed `desk_status` with `ok: true`; and reported duplication total `0`.

The focused startup policy, startup composition, and V2 closure command passed all 38 tests. The frozen six-witness baseline remained exactly 341 tests with 327 passing and the 14 known failures. Hosted-worker and dispatch tests passed 338/338. Manifest parsing, skill-description validation, JavaScript syntax, and `git diff --check` passed.

## Independent review

The first review invalidated the initial candidate because it removed consumer-specific admission that pinned Desk did not own and inferred composition from cache state without requiring connected MCPs. Commit `1f774ef` restored the gate and moved proof to roots captured at the Copilot execution boundary.

The second review found that accepting any valid wrapper capture could let an auxiliary invocation mask a broken requested session. Commit `e1fe024` records argv atomically and selects only the capture carrying the exact requested `--session-id`. Scoped re-review of that commit returned no findings.

## Limitations and dispositions

- `scripts/working-with-onenote.test.mjs`, named by the plan, does not exist on the frozen `v2-alpha` lineage; no substitute result is claimed.
- Three deterministic macOS junction-emulation failures remain in the unchanged Scout Windows suite; no Scout files changed and the issue is outside Task 7.
- An intermediate exact smoke was blocked when the EMU GitHub REST quota reached zero and Agency correctly omitted unresolved dependencies. After the quota reset, the requested-session-bound smoke passed on the exact final head.
- The smoke disables Agency update-ring checks with `AGENCY_NO_UPDATE_CHECK=1`, `AGENCY_NO_AUTO_UPDATE=1`, and `--update-check-ttl 0`; it does not use `TF_BUILD`, which changed runtime composition.
