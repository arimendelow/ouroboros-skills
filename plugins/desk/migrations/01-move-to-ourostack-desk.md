---
id: 01-move-to-ourostack-desk
description: Move Desk from the ouroboros-skills marketplace to ourostack/desk (2026-09-24)
safety: safe
needs_restart: true
---

## Detect

```bash
claude plugin list 2>/dev/null | grep -q "desk@ouroboros-skills" && exit 0
grep -qs "ourostack/ouroboros-skills:plugins/desk" "${AGENCY_TOML:-$HOME/.local/agency/agency.toml}" && exit 0
exit 1
```

## Safety check

```bash
command -v git >/dev/null && command -v gh >/dev/null || { echo "git and gh are required"; exit 1; }
```

## Migrate

```bash
set -e
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if command -v claude >/dev/null && claude plugin list 2>/dev/null | grep -q "desk@ouroboros-skills"; then
  claude plugin marketplace add ourostack/desk
  claude plugin install desk@ourostack
  OLD="$CFG/plugins/data/desk-ouroboros-skills/desk.activation.json"
  NEW="$CFG/plugins/data/desk-ourostack/desk.activation.json"
  if [ -f "$OLD" ] && [ ! -f "$NEW" ]; then mkdir -p "$(dirname "$NEW")" && cp "$OLD" "$NEW"; fi
  for p in desk superpowers plain-language crew; do claude plugin uninstall "$p@ouroboros-skills" 2>/dev/null || true; done
  claude plugin marketplace remove ouroboros-skills 2>/dev/null || true
  claude plugin marketplace update ourostack
fi
T="${AGENCY_TOML:-$HOME/.local/agency/agency.toml}"
if [ -f "$T" ] && grep -q "ourostack/ouroboros-skills:plugins/" "$T"; then
  cp "$T" "$T.pre-ourostack-desk"
  sed -i.bak -E 's#github:ourostack/ouroboros-skills:plugins/(desk|superpowers|plain-language|crew)@[A-Za-z0-9._/-]+#github:ourostack/desk:plugins/\1@main#g' "$T" && rm -f "$T.bak"
fi
```

## Announce

```bash
echo "Desk moved to ourostack/desk. Restart this session so Desk loads from its new home; your desk binding carried over."
```
