---
id: 01-move-to-ourostack-desk
description: Move a V2 Desk install from the ouroboros-skills v2-alpha channel to ourostack/desk (2026-09-24)
safety: safe
needs_restart: true
---

## Detect

```bash
T="${AGENCY_TOML:-$HOME/.local/agency/agency.toml}"
grep -Eqs 'github:ourostack/ouroboros-skills:plugins/(desk|superpowers|plain-language|crew)@v2-alpha([^A-Za-z0-9._/-]|$)' "$T" && exit 0
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
command -v claude >/dev/null && command -v jq >/dev/null || exit 1
ref="$({ jq -r '."ouroboros-skills".source.ref // empty' "$CFG/plugins/known_marketplaces.json"; jq -r '.extraKnownMarketplaces."ouroboros-skills".source.ref // empty' "$CFG/settings.json"; } 2>/dev/null | head -n 1)"
[ "$ref" = "v2-alpha" ] || exit 1
claude plugin list --json 2>/dev/null | jq -e 'any(.[]; .id == "desk@ouroboros-skills")' >/dev/null
```

## Safety check

```bash
command -v git >/dev/null && command -v gh >/dev/null || { echo "git and gh are required"; exit 1; }
if command -v claude >/dev/null && ! command -v jq >/dev/null; then echo "jq is required to move the Claude Code plugins; install jq, then restart the session"; exit 1; fi
exit 0
```

## Migrate

```bash
set -eu
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
T="${AGENCY_TOML:-$HOME/.local/agency/agency.toml}"
failed=""

# Agency: move only V2 channel coordinates (@v2-alpha). V1 entries (@main or no ref) stay as they are.
if [ -f "$T" ] && grep -Eq 'github:ourostack/ouroboros-skills:plugins/(desk|superpowers|plain-language|crew)@v2-alpha([^A-Za-z0-9._/-]|$)' "$T"; then
  [ -e "$T.pre-ourostack-desk" ] || cp "$T" "$T.pre-ourostack-desk"
  tmp="$(mktemp)"
  sed -E 's#github:ourostack/ouroboros-skills:plugins/(desk|superpowers|plain-language|crew)@v2-alpha([^A-Za-z0-9._/-]|$)#github:ourostack/desk:plugins/\1@main\2#g' "$T" > "$tmp"
  # Write back into the existing file so a symlinked agency.toml stays a symlink.
  cat "$tmp" > "$T"
  rm -f "$tmp"
fi

# Claude Code: move only a V2 install, meaning desk@ouroboros-skills from a marketplace that tracks v2-alpha.
old_ref() {
  { jq -r '."ouroboros-skills".source.ref // empty' "$CFG/plugins/known_marketplaces.json"; jq -r '.extraKnownMarketplaces."ouroboros-skills".source.ref // empty' "$CFG/settings.json"; } 2>/dev/null | head -n 1
}
installed() {
  claude plugin list --json 2>/dev/null | jq -r '.[] | "\(.id) \(.scope // "user")"'
}
if command -v claude >/dev/null && [ "$(old_ref)" = "v2-alpha" ] && installed | grep -q '^desk@ouroboros-skills '; then
  before="$(installed)"
  scope_of() { printf '%s\n' "$before" | awk -v id="$1@ouroboros-skills" '$1 == id { print $2; exit }'; }
  claude plugin marketplace add ourostack/desk
  claude plugin marketplace update ourostack
  # Keep automatic updates on for the new marketplace, as SETUP.md sets them. Every other setting is preserved.
  S="$CFG/settings.json"
  [ -s "$S" ] || echo '{}' > "$S"
  tmp="$(mktemp)"
  jq '.extraKnownMarketplaces.ourostack = ((.extraKnownMarketplaces.ourostack // {"source": {"source": "github", "repo": "ourostack/desk"}}) + {"autoUpdate": true})' "$S" > "$tmp"
  cat "$tmp" > "$S"
  rm -f "$tmp"
  # Carry the saved desk binding over; never overwrite one the new install already has.
  OLD="$CFG/plugins/data/desk-ouroboros-skills/desk.activation.json"
  NEW="$CFG/plugins/data/desk-ourostack/desk.activation.json"
  if [ -f "$OLD" ] && [ ! -f "$NEW" ]; then mkdir -p "$(dirname "$NEW")" && cp "$OLD" "$NEW"; fi
  # Reinstall every moved plugin from ourostack in its original scope. Superpowers and Plain Language normally arrive as Desk's dependencies.
  for p in desk crew superpowers plain-language; do
    scope="$(scope_of "$p")"
    [ -n "$scope" ] || continue
    installed | grep -q "^$p@ourostack " || claude plugin install --scope "$scope" "$p@ourostack"
  done
  # Remove the old copies, dependents first, keeping their data.
  for p in crew desk superpowers plain-language; do
    scope="$(scope_of "$p")"
    [ -n "$scope" ] || continue
    claude plugin uninstall --scope "$scope" --keep-data "$p@ouroboros-skills" || failed="$failed $p@ouroboros-skills"
  done
  # Plugins that stay in ouroboros-skills (such as Work Suite and Ponytail) keep their marketplace.
  if [ -z "$failed" ] && ! installed | grep -q '@ouroboros-skills '; then
    claude plugin marketplace remove ouroboros-skills
  fi
fi

if [ -n "$failed" ]; then
  echo "Desk is now installed from ourostack/desk, but Claude Code could not uninstall:$failed. Uninstall each with 'claude plugin uninstall <plugin>' (add --scope project or --scope local if it was installed there), then restart the session." >&2
  exit 1
fi
```

## Announce

Desk moved to ourostack/desk. Claude Code now runs `desk@ourostack` (with Superpowers, Plain Language and, if you had it, Crew) from the `ourostack` marketplace with automatic updates on, and your desk binding carried over. Agency entries that tracked `@v2-alpha` now track `github:ourostack/desk:plugins/<name>@main`; the original file is kept as `agency.toml.pre-ourostack-desk`. Plugins that stay in ouroboros-skills, such as Work Suite, keep that marketplace. Restart this session so Desk loads from its new home.
