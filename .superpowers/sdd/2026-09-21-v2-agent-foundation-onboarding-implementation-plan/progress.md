# SDD ledger — plan: /Users/microsoft/code/platform-workflows/desks/ari/worker-self-definition/agentic-engineering-frontier/_planning/2026-09-21-v2-agent-foundation-onboarding-implementation-plan.md

## Preflight

**Spec:** `/Users/microsoft/code/platform-workflows/desks/ari/worker-self-definition/agentic-engineering-frontier/_planning/2026-09-21-v2-agent-foundation-onboarding-design.md`

**Ourostack base:** `a777e312e2a9080b4b5d685505500fb3811e486d`

| Task | Internal consistency | Shared file/interface check | Finding / ruling |
|---|---|---|---|
| 1 | RFC tests precede RFC creation and the task ends with a focused commit. | Produces the canonical RFC path consumed by Tasks 2, 4 and 9. | Clean. |
| 2 | Foundation contract test precedes the skill and orchestration edits. | Produces the exact foundation clauses consumed by Task 3 startup tests and Tasks 6-8 composition. | Clean. |
| 3 | Host tests verify full foundation clauses exactly once before packaging changes. | Consumes Task 2; modifies worker/activation surfaces later relied on by downstream subtraction. | Clean. |
| 4 | Onboarding tests precede skill changes and define exactly two top-level paths. | Consumes RFC/foundation; produces generic entrances used by Task 9 commands and Task 10 fixtures. | Clean. |
| 5 | Versioning follows the final generic diff; full gates and review precede publication. | Freezes the Desk candidate SHA consumed by Task 6. | Clean. |
| 6 | Composition tests precede dependency and `using-ms-desk` implementation. | Pins Task 5 Desk SHA and adds Teams Approvals; produces the MS foundation consumed by Task 7 and PWF. | Clean. |
| 7 | Installed proof precedes worker-body subtraction. | Reuses Task 6 tests and produces the MS Desk candidate SHA consumed by Task 8. | Clean. |
| 8 | PWF tests and installed owner proof precede body subtraction. | Consumes Task 7; preserves Desk MCP adapter and produces the PWF candidate consumed by Task 10. | Clean. |
| 9 | Private provenance and exact commands wait for candidate refs. | Consumes Tasks 5, 7 and 8; updates only Ari desk state through direct main commits. | Clean. |
| 10 | Receipt schema precedes eight qualification lanes. | Consumes all three candidate SHAs and produces evidence required by Task 11. | Clean. |
| 11 | Reconciliation, review, merge/retention, readback and final state are ordered. | Consumes qualification; may repin upstream SHAs and must rerun invalidated proof. | Clean. |
| 1 → 2 | Task 1 creates the RFC link target; Task 2 points to it. | One canonical copy enforced repo-wide. | Clean. |
| 2 → 3 | Task 2 defines required phrases; Task 3 verifies those phrases in effective startup. | A name-only skill reference cannot pass. | Clean. |
| 3 → 7/8 | Task 3 proves inherited generic startup before downstream removal. | Subtraction remains blocked until installed proof repeats the owner checks. | Clean. |
| 5 → 6 | Task 5 freezes and pushes the reviewed fork commit; Task 6 pins the full SHA. | Full SHA reachability is checked before manifest mutation. | Clean. |
| 6 → 7 | Task 6 creates the skill/dependency; Task 7 proves and then subtracts. | Same tests continue after subtraction. | Clean. |
| 7 → 8 | Task 7 produces a protected MS candidate; Task 8 keeps it as PWF's sole foundation dependency. | No direct Desk/Superpowers/Approvals redeclaration in PWF. | Clean. |
| 8 → 10 | Task 8 preserves PWF authority adapters; Task 10 exercises them at installed boundary. | Consumer proof remains separate from generic implementation. | Clean. |
| 9 → 10 | Task 9 publishes exact candidate commands; Task 10 validates those commands. | Any ref change invalidates and reruns the affected lane. | Clean. |
| 10 → 11 | Task 10 records pass/fail/limited proof; Task 11 may claim only what passed. | Candidate-limited upstream state remains explicit. | Clean. |

**Ruling:** Use the current repository `main` heads as implementation bases while preserving the frozen September 21 alpha refs as qualification baselines, not as stale code bases. The spec authorizes a named RC milestone and requires current source plus exact installed receipts. Cost if wrong: the candidate could diverge from the originally frozen tree and require a compatibility comparison before publication.

**Ruling:** Treat the current public Ourostack contribution as an approved fork-and-PR path because Ari explicitly approved moving the canonical generic RFC and startup behavior into Ourostack, while direct upstream permission is read-only. Cost if wrong: the implementation remains on Ari's fork and must be transferred or abandoned rather than merged upstream.

**Baseline:** `node scripts/test-desk-docs.cjs` and `node scripts/validate-skills.cjs` pass after `npm ci` in `plugins/desk/mcp`; the initial missing `better-sqlite3` failure was a fresh-worktree dependency gap.

Task 1: complete (commits a777e31..011253f, review clean)

Task 2: fix round 1/5 (1 addressed, 0 open — preserve required controls in flow judgment; commit 6ef3df7)

Task 2: complete (commits 011253f..6ef3df7, review clean)

Task 3: fix round 1/5 (3 addressed, 0 open — Copilot plugin-owned startup hook, runtime packaging test, no-hard-wrap foundation; commit 663d5f7)

Task 3: complete (commits 6ef3df7..663d5f7, review clean)

Task 4: Ruling: expand the task's file set to `plugins/desk/skills/session-start/SKILL.md` because the spec requires an executable V1-upgrade entrance and the existing startup router is the owning caller; descriptive text in `first-run-bootstrap` is not a path. Cost if wrong: startup routing gains one additional migration detection branch and may need later simplification if another canonical V1 detector already exists.

Task 5 preflight: Ruling: invalidate Tasks 1-4 branch-level review evidence against `origin/main` and port the same reviewed intent onto the frozen `origin/v2-alpha` lineage at `602d03c0b1445231bc7bc8babb95247ea6510e2e`. Evidence: `origin/main...frozen` is `1 234`; main carries Desk `3.1.2` / MCP `1.3.4`, while frozen carries Desk `3.2.0-alpha.6` / MCP `1.4.0-alpha.6`. Cost if wrong: porting may encounter alpha-specific conflicts and every affected task must be revalidated and re-reviewed on the correct base.

Plan revision: `teams-microsoft/platform-workflows@bc696699` supersedes the original start-from-main instructions. The spec, numbered plan, and task card now bind the generic work to frozen source `602d03c0b1445231bc7bc8babb95247ea6510e2e`, add source-authority and stage-local visual-proof requirements to Task 2, add a test-first `git-hygiene` safeguard for dirty state-repository reconciliation, require section-scoped behavioral assertions, target the public contribution to `v2-alpha`, and require future execution discoveries to enter the spec, plan, and ledger before implementation.

Ruling: treat every execution-discovered requirement or safety correction as a plan delta before implementation, rather than an ad hoc follow-up unit. Cost if wrong: a small urgent correction may wait for one planning edit, but task scope, review coverage, and recovery state remain visible and coherent.

Task 2: reopened on the frozen alpha lineage. Commit `14c142c` adds the planned source-authority and visual-proof invariants, but task review found one High gap: `scripts/test-using-desk-foundation.cjs` asserts new phrases file-wide instead of binding them to their owning sections. The review also found one Medium traceability error in `alpha-port-report.md`: it names the pre-amend source-authority-only subject instead of the actual reviewed commit subject.

Plan revision: `teams-microsoft/platform-workflows@e8a0828e` adds the operator's mid-execution requirement-change behavior to the approved spec, Task 2, task card, qualification fixture, and canonical public RFC scope. A material requirement added during implementation must remain on the same durable task, update its spec, numbered plan, and progress ledger before implementation, identify invalidated assumptions/tests/review evidence, keep unaffected authorized work moving, and send the affected change through the normal implementation and review gates. The public RFC explains the boundary and rationale without copying the plan or detailed procedure.

Task 2: scope added after commit `5a3b3a2`. The section-scoped contract and `git-hygiene` safeguards are implemented, but Task 2 remains open until `using-desk` and its owning-section contract include the new mid-execution requirement behavior. Review evidence produced against the prior brief remains useful for the unchanged contract and Git safeguards but cannot complete the revised Task 2.

Task 2: fix round 1/5 (5 addressed, 0 open — pinned/frozen exact-ref contract, tracked-versus-ignored report clarity, same-task requirement changes, public RFC rationale, generated Codex freshness; commit `c267665`)

Task 2: complete (commits `8cb8899`, `5aea355`, `14c142c`, `5a3b3a2`, `c267665`; review clean on the revised plan)

Task 1 correct-alpha review: one Important fix unit remains. `scripts/test-desk-docs.cjs` must enforce the RFC's exact top-level section set, and `plugins/desk/mcp/__tests__/docs/desk_docs_validation.test.js` must update its success fixture for the stricter validator. Minor deferred to final review: the final-state review package included a later Task 3 README startup-detail hunk; that hunk was not part of the Task 1 commit and does not change Task 1's RFC pointer contract.

Task 3 correct-alpha review: one Important and one Minor fix unit remain. Correct the stale `worker.agent.md` claim that Copilot carries `using-desk` in the agent source, and add a lightweight/no-network/no-Git/no-scan regression guard for the Copilot startup hook matching the claimed startup boundary.

Task 4 correct-alpha review: two Important fixes remain. Existing local Crew workspaces must enter repository-first migration before activation/sync and explicitly preserve untracked inventory; the operational contract test must enforce the exact two top-level path heading sets so a third path fails.

Task 1: fix round 1/5 (2 addressed, 0 open — exact RFC top-level section contract and updated docs-validator fixtures/tests; commit `588c733`)

Task 1: complete (commits `19babcd`, `c267665`, `588c733`; correct-alpha review clean; later Task 3 README startup detail remains outside Task 1 scope)

Task 3: fix round 1/5 (2 addressed, 1 new Important open — corrected Copilot runtime-injection claim and added lightweight hook guards; scratch report accidentally tracked in commit `6ca17ba`)

Task 3: fix round 2/5 (1 addressed, 0 open — untracked the task report without changing approved product files; commit `6191c23`)

Task 3: complete (commits `b7d4578`, `25d2ff8`, `6ca17ba`, `6191c23`; correct-alpha review clean)

Task 4: fix round 1/5 (3 addressed, 0 open — preserved ignored/untracked Crew-v1 inventory and rollback boundary, routed existing legacy workspaces through repository-first migration, enforced exact two operational path headings; commit `3d134cd`)

Task 4: complete (commits `13bc482`, `250e7e2`, `3d134cd`; correct-alpha review clean)

Task 5: release ruling: Desk advances from `3.2.0-alpha.6` to `3.2.0-alpha.7` because plugin skills, hooks, activation, tests, and public docs changed; Desk MCP remains `1.4.0-alpha.6` because no MCP runtime/package implementation changed. Cost if wrong: downstream consumers may need a Desk repin without an MCP repin, and generated host metadata must stay release-coupled.

Task 5: metadata implementation complete at `aed61a6`; focused release/docs/generated/host/foundation/onboarding checks pass. Review finding on two directly changed tests was closed by running `copilot_packaging.test.js` (13/13) and `test-work-suite-contracts.cjs` (pass), with no code change required. Full admissible gate and whole-branch review remain open.

Task 5 gate investigation: the first gate ran under Node `20.19.5`, not the plan's Node 22 runtime, so the quoted Desk MCP test glob failed before discovery; this is an environment mismatch, not baseline test evidence. The V2 eval validation failure is branch-caused because `plugins/desk/principles.md` and `plugins/desk/skills/work-orchestration/SKILL.md` are reviewed sources in `evals/engineering-v2-kernel.json`; its fingerprint must be re-reviewed and refreshed. Plan revision `teams-microsoft/platform-workflows@d7a288d2` binds both requirements before correction.

Task 5: eval fingerprints refreshed and reviewed in `928e231` for both affected suites. The Node 22 gate passes 15/17 commands; the full Desk MCP suite and coverage remain non-terminating on byte-identical frozen-alpha surfaces, with no changed-path regression found and no green full-suite claim.

Final whole-branch review: three Important findings enter the single final fix wave. Plan revision `teams-microsoft/platform-workflows@6421b682` requires an executable in-place V1 Desk upgrade branch, an executable in-place Crew-v1 repository migration branch, and the complete child-agent startup non-inheritance/bounded-brief contract.

Final fix wave: commit `4aa4918` addresses all three findings with executable ordered branches and section-owned tests. Scoped re-review verdict: all findings addressed; exact two paths, generated fixtures, Desk MCP `1.4.0-alpha.6`, and scratch-artifact hygiene remain intact.

Task 5: candidate head `4aa4918`; Desk `3.2.0-alpha.7`; full deterministic Node 22 gates pass; full MCP suite and coverage remain disclosed frozen-alpha timeouts on unchanged surfaces; final whole-branch review clean.

Task 6 preflight: Ruling: bind MS Desk implementation to frozen `origin/v2-alpha` commit `b3eedeae29e45e5705d7795b4c6b211d283f0bc4`, not divergent `main`; target the eventual PR to `v2-alpha`. Cost if wrong: the MS candidate may require replay onto a different base, but it will not silently mix V1/current-main assumptions into the frozen V2 qualification lineage.

Task 6: fix round 1/5 (3 addressed, 1 open — full five-dependency contract, corrected native manifest path, fork-head proof, startup-policy and closure witnesses; commit `7eb4ce3`)

Task 6: fix round 2/5 (2 addressed, 1 new Important open — removed stale four-Generic desired-state assertion and restored six-file witness execution, but child failures were success-shaped; commit `53b684a`)

Task 6: fix round 3/5 (failure suppression addressed, full passing-title drift remained open — exact 14-title failure baseline and strict TAP structure; commit `f686063`)

Task 6: fix round 4/5 (1 addressed, 0 open — complete ordered 341-entry status/title SHA-256 fingerprint plus non-sentinel mutation proof; commit `476c182`)

Task 6: complete (commits `b3eedea..476c182`, review clean)

Task 7 mid-execution requirement: Ruling: apply an explicit no-muda value gate to all remaining work. A probe, test, artifact, abstraction, review, or repeated execution must close a distinct release claim or replace weaker evidence; otherwise reuse, consolidate, skip, or delete it. Cost if wrong: a potentially useful secondary diagnostic may be omitted, but the blessed path remains bounded to evidence that changes readiness or publication decisions.

Task 7 review correction (2026-09-22): Ruling: retain MS Desk's consumer-specific selected-root, compatibility, provider-exclusivity, and loaded-byte admission gate because the pinned Desk `session-start` and `using-desk` surfaces do not implement that behavior; delegation prose cannot replace a missing owner. Strengthen the installed smoke to capture Copilot's actual `--plugin-dir` arguments, resolve identities and skill owners from those loaded roots rather than the Agency cache, reject duplicate or shadow providers, and require Desk and Approvals to be connected. The first Task 7 candidate `3974279` is review-invalidated. Cost if wrong: the worker remains larger until a lower layer owns the gate, but startup cannot silently accept an invalid effective composition.

Task 7: fix round 1/5 (2 High findings addressed — retained consumer admission, proved engine-loaded roots, required connected Desk and Approvals MCPs; commit `1f774ef`)

Task 7: fix round 2/5 (1 Medium finding addressed — atomic argv capture and exact requested-session selection prevent auxiliary invocation masking; commit `e1fe024`)

Task 7: complete (commits `3974279`, `1f774ef`, `a2ffde8`, `e1fe024`; exact-head installed smoke passed with six roots, exact skill owners, connected Desk/Approvals, successful `desk_status`, and zero duplication; scoped re-review clean)
