# Task 1 Report — Freeze Readiness Policy and Terminal Failure Contracts

## Implementation details

- Added `plugins/desk/mcp/src/activation/readiness-policy.js` with `normalizeReadinessPolicy(value, context)`, freezing the canonical Desk runtime policy and rejecting unsupported values with terminal `activation_policy_invalid` failures.
- Added `plugins/desk/mcp/src/activation/failures.js` with the stable `terminalFailure(...)` envelope and `ActivationFailure extends Error`.
- Wired `desk_runtime` into the activation manifest schema in `plugins/desk/mcp/src/activation/schema.js`.
- Wired manifest validation through the readiness normalizer in `plugins/desk/mcp/src/activation/validate.js`, preserving existing diagnostic collection by translating readiness failures back into manifest diagnostics.
- Added the canonical `desk_runtime` block to `plugins/desk/activation/desk.activation.json`:

```json
{
  "root": "workspace",
  "write_authority": "workspace",
  "lexical": "required",
  "semantic": "background"
}
```

- Added `plugins/desk/mcp/__tests__/activation/readiness_policy.test.js` for the new normalizer and extended `plugins/desk/mcp/__tests__/activation/activation_contract.test.js` to cover schema wiring, manifest validation, canonical manifest contents, and terminal failure shape.

## Files changed

- `plugins/desk/activation/desk.activation.json`
- `plugins/desk/mcp/__tests__/activation/activation_contract.test.js`
- `plugins/desk/mcp/__tests__/activation/readiness_policy.test.js`
- `plugins/desk/mcp/src/activation/failures.js`
- `plugins/desk/mcp/src/activation/readiness-policy.js`
- `plugins/desk/mcp/src/activation/schema.js`
- `plugins/desk/mcp/src/activation/validate.js`

## Self-review

- Scope stayed inside Task 1: only readiness policy normalization, terminal failure contract, schema wiring, canonical manifest, and tests changed.
- Warm admission, controllers, indexing, search routing, semantic warming, and downstream consumer migration were not implemented.
- Validation stays in the existing manifest-diagnostic shape: readiness-policy failures are normalized once, then converted into the current `{ path, code, message, action }` error structure.
- The new terminal failure helper clones payload objects/arrays before exposing them on the error/envelope so callers cannot mutate the captured contract by retaining input references.

## Concerns

- `PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" npm --prefix plugins/desk/mcp run test:coverage` was executed once as required, but the full Desk MCP coverage run did not complete within a 1200-second Python wrapper timeout. The wrapper exited with:

```text
subprocess.TimeoutExpired: Command '['npm', '--prefix', 'plugins/desk/mcp', 'run', 'test:coverage']' timed out after 1200 seconds
```

- Because the full coverage suite did not finish, Task 1 has strong targeted proof but not a completed full-suite green signal in this environment.

## TDD evidence

### RED

Command:

```bash
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" node --test plugins/desk/mcp/__tests__/activation/readiness_policy.test.js
```

Output:

```text
TAP version 13
# Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/microsoft/code/wt-desk-deterministic-activation-20260916/plugins/desk/mcp/src/activation/readiness-policy.js' imported from /Users/microsoft/code/wt-desk-deterministic-activation-20260916/plugins/desk/mcp/__tests__/activation/readiness_policy.test.js
# Subtest: plugins/desk/mcp/__tests__/activation/readiness_policy.test.js
not ok 1 - plugins/desk/mcp/__tests__/activation/readiness_policy.test.js
  ...
# pass 0
# fail 1
```

### GREEN

Command:

```bash
PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" node --test plugins/desk/mcp/__tests__/activation/readiness_policy.test.js plugins/desk/mcp/__tests__/activation/activation_contract.test.js
```

Output:

```text
TAP version 13
# Subtest: activation schema exports the supported version and required top-level fields
ok 1 - activation schema exports the supported version and required top-level fields
# Subtest: activation validation requires MCP, root, artifact, host, and permission policy fields
ok 7 - activation validation requires MCP, root, artifact, host, and permission policy fields
# Subtest: terminal failure helpers produce stable non-retryable activation envelopes
ok 14 - terminal failure helpers produce stable non-retryable activation envelopes
# Subtest: canonical Desk activation manifest exists and validates
ok 15 - canonical Desk activation manifest exists and validates
# Subtest: readiness policy accepts lexical-required background-semantic consumers
ok 16 - readiness policy accepts lexical-required background-semantic consumers
# Subtest: readiness policy defaults workspace authority and required lexical service
ok 17 - readiness policy defaults workspace authority and required lexical service
# Subtest: readiness policy rejects weaker lexical service
ok 18 - readiness policy rejects weaker lexical service
1..18
# pass 18
# fail 0
```
