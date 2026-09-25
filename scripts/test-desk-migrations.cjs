#!/usr/bin/env node
"use strict";

// Exercises Desk's session-start migrations without touching a real Claude or
// Agency configuration. A fake `claude` placed first on PATH records every call,
// keeps installed plugins and marketplaces in files this test controls, and can
// fail chosen commands; HOME, CLAUDE_CONFIG_DIR and AGENCY_TOML all point into a
// temporary directory.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const deskRoot = path.join(repoRoot, "plugins", "desk");
const migrationsDir = path.join(deskRoot, "migrations");
const MOVE_ID = "01-move-to-ourostack-desk";
const MOVE_FILE = path.join(migrationsDir, `${MOVE_ID}.md`);
const MOVE_LINE = `Desk has moved to ourostack/desk. Run the move-to-ourostack-desk migration now (desk:session-start-migrations): ${MOVE_FILE}`;
const SECTIONS = ["Detect", "Safety check", "Migrate", "Announce"];
const BASH_SECTIONS = new Set(["Detect", "Safety check", "Migrate"]);

function which(tool) {
  const result = spawnSync("bash", ["-c", `command -v ${tool}`], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}
const BASH = which("bash");
assert.ok(which("jq"), "the migration harness needs jq, as Desk's session start does");

const FAKE_CLAUDE = `#!/usr/bin/env bash
# Test double for the Claude Code CLI. Records every call, keeps installed plugins
# ("<id> <scope>" lines) in a state file and marketplaces in the config files the
# real CLI writes, and fails any call matching the FAKE_CLAUDE_FAIL regex.
printf '%s\\n' "$*" >> "$FAKE_CLAUDE_LOG"
if [ -n "\${FAKE_CLAUDE_FAIL:-}" ] && printf '%s\\n' "$*" | grep -Eq "$FAKE_CLAUDE_FAIL"; then
  echo "fake claude: failing $*" >&2
  exit 1
fi
state="$FAKE_CLAUDE_STATE"
touch "$state"
cfg="\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
known="$cfg/plugins/known_marketplaces.json"
settings="$cfg/settings.json"
[ "$1" = plugin ] || { echo "fake claude: unexpected arguments: $*" >&2; exit 2; }
shift
cmd="$1"; shift
if [ "$cmd" = marketplace ]; then cmd="marketplace-$1"; shift; fi
scope=user; json=0; pos=()
while [ $# -gt 0 ]; do
  case "$1" in
    --scope|-s) scope="$2"; shift 2 ;;
    --json) json=1; shift ;;
    --keep-data) shift ;;
    -*) echo "fake claude: unknown flag $1" >&2; exit 2 ;;
    *) pos+=("$1"); shift ;;
  esac
done
edit() {
  local file="$1"; shift
  [ -s "$file" ] || { mkdir -p "$(dirname "$file")"; echo '{}' > "$file"; }
  jq "$@" "$file" > "$file.next" && mv "$file.next" "$file"
}
has_marketplace() { [ -s "$known" ] && jq -e --arg n "$1" 'has($n)' "$known" >/dev/null; }
add_plugin() { grep -q "^$1 " "$state" || printf '%s %s\\n' "$1" "$2" >> "$state"; }
case "$cmd" in
  list)
    if [ "$json" = 1 ]; then
      jq -Rn '[inputs | select(length > 0) | split(" ") | {id: .[0], scope: .[1], enabled: true}]' < "$state"
    elif [ ! -s "$state" ]; then
      echo "No plugins installed."
    else
      printf 'Installed plugins:\\n\\n'
      while read -r id s; do
        printf '  \\342\\235\\257 %s\\n    Version: 0.0.0\\n    Scope: %s\\n    Status: \\342\\234\\224 enabled\\n\\n' "$id" "$s"
      done < "$state"
    fi
    ;;
  install)
    id="\${pos[0]}"
    has_marketplace "\${id#*@}" || { echo "Marketplace \${id#*@} not found" >&2; exit 1; }
    add_plugin "$id" "$scope"
    if [ "$id" = desk@ourostack ] && [ -z "\${FAKE_CLAUDE_NO_DEPS:-}" ]; then
      add_plugin superpowers@ourostack user
      add_plugin plain-language@ourostack user
    fi
    ;;
  uninstall)
    id="\${pos[0]}"
    grep -qx "$id $scope" "$state" || { echo "Plugin \\"$id\\" is not installed in $scope scope" >&2; exit 1; }
    grep -vx "$id $scope" "$state" > "$state.next"; mv "$state.next" "$state"
    ;;
  marketplace-add)
    src="\${pos[0]}"; repo="\${src%%#*}"
    case "$repo" in
      ourostack/desk) name=ourostack ;;
      ourostack/ouroboros-skills) name=ouroboros-skills ;;
      *) echo "fake claude: unknown marketplace $src" >&2; exit 2 ;;
    esac
    if [ "$src" = "$repo" ]; then source="{\\"source\\":\\"github\\",\\"repo\\":\\"$repo\\"}"; else source="{\\"source\\":\\"github\\",\\"repo\\":\\"$repo\\",\\"ref\\":\\"\${src#*#}\\"}"; fi
    edit "$known" --arg n "$name" --argjson s "$source" '.[$n] = ((.[$n] // {}) + {source: $s})'
    edit "$settings" --arg n "$name" --argjson s "$source" '.extraKnownMarketplaces[$n] = ((.extraKnownMarketplaces[$n] // {}) + {source: $s})'
    ;;
  marketplace-update)
    has_marketplace "\${pos[0]}" || { echo "Marketplace \${pos[0]} not found" >&2; exit 1; }
    ;;
  marketplace-remove)
    name="\${pos[0]}"
    has_marketplace "$name" || { echo "Marketplace $name not found" >&2; exit 1; }
    edit "$known" --arg n "$name" 'del(.[$n])'
    edit "$settings" --arg n "$name" 'del(.extraKnownMarketplaces[$n])'
    grep -v "@$name " "$state" > "$state.next"; mv "$state.next" "$state"
    ;;
  *)
    echo "fake claude: unexpected arguments: plugin $cmd" >&2
    exit 2
    ;;
esac
`;

function parseMigration(file) {
  const text = fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
  const stem = path.basename(file, ".md");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(text);
  assert.ok(match, `${stem}: missing YAML frontmatter`);
  const frontmatter = Object.fromEntries(
    match[1].split("\n").filter(Boolean).map((line) => {
      const index = line.indexOf(":");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
  );
  assert.equal(frontmatter.id, stem, `${stem}: frontmatter id must match the filename stem`);
  assert.ok(frontmatter.description, `${stem}: frontmatter needs a description`);
  assert.equal(frontmatter.safety, "safe", `${stem}: only safety: safe is implemented`);
  assert.match(frontmatter.needs_restart, /^(true|false)$/u, `${stem}: needs_restart must be true or false`);

  const parts = match[2].split(/^## (.+)$/mu);
  assert.equal(parts[0].trim(), "", `${stem}: no text may precede the first section`);
  const headings = [];
  const blocks = {};
  for (let index = 1; index < parts.length; index += 2) {
    const heading = parts[index].trim();
    const body = parts[index + 1].trim();
    headings.push(heading);
    if (BASH_SECTIONS.has(heading)) {
      const fence = /^```bash\n([\s\S]*?)\n```$/u.exec(body);
      assert.ok(fence && !fence[1].includes("```"), `${stem}: section ${heading} must hold exactly one fenced bash block`);
      blocks[heading] = fence[1];
    } else {
      // The driver prints Announce verbatim, so it is plain text, never a code fence.
      assert.ok(body.length > 0 && !body.includes("```"), `${stem}: Announce must be plain text without a code fence`);
      blocks[heading] = body;
    }
  }
  assert.deepEqual(headings, SECTIONS, `${stem}: sections must be ${SECTIONS.join(", ")} in that order`);
  return { frontmatter, blocks };
}

// Tools the migration blocks use, for the sandbox where claude is absent from PATH.
const BLOCK_TOOLS = ["bash", "sh", "grep", "sed", "awk", "cp", "cat", "rm", "mv", "mkdir", "mktemp", "dirname", "head", "jq", "git"];

function makeSandbox({
  installed = [],
  oldRef,
  oldAutoUpdate = true,
  agencyToml = null,
  agencyBak = null,
  symlinkToml = false,
  oldBinding = null,
  newBinding = null,
  claude = true,
  fail = "",
  noDeps = false,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "desk-migration-"));
  const bin = path.join(root, "bin");
  const home = path.join(root, "home");
  const cfg = path.join(root, "claude-config");
  for (const dir of [bin, home, cfg]) fs.mkdirSync(dir);
  const sandbox = {
    root,
    home,
    cfg,
    fakeClaude: path.join(bin, "claude"),
    state: path.join(root, "claude-installed.txt"),
    log: path.join(root, "claude-calls.log"),
    toml: path.join(root, "agency.toml"),
    tomlTarget: path.join(root, "dotfiles", "agency.toml"),
    settings: path.join(cfg, "settings.json"),
    known: path.join(cfg, "plugins", "known_marketplaces.json"),
    oldBinding: path.join(cfg, "plugins", "data", "desk-ouroboros-skills", "desk.activation.json"),
    newBinding: path.join(cfg, "plugins", "data", "desk-ourostack", "desk.activation.json"),
  };
  if (claude) fs.writeFileSync(sandbox.fakeClaude, FAKE_CLAUDE, { mode: 0o755 });
  // The Safety check requires gh; a stub keeps the test independent of the runner's tools.
  fs.writeFileSync(path.join(bin, "gh"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
  fs.writeFileSync(sandbox.state, installed.map((entry) => `${entry.includes(" ") ? entry : `${entry} user`}\n`).join(""));
  fs.writeFileSync(sandbox.log, "");
  const settings = { autoMemoryEnabled: false, hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo mine" }] }] } };
  if (oldRef !== undefined) {
    const source = { source: "github", repo: "ourostack/ouroboros-skills", ...(oldRef ? { ref: oldRef } : {}) };
    settings.extraKnownMarketplaces = { "ouroboros-skills": { source, ...(oldAutoUpdate ? { autoUpdate: true } : {}) } };
    fs.mkdirSync(path.dirname(sandbox.known), { recursive: true });
    fs.writeFileSync(sandbox.known, `${JSON.stringify({ "ouroboros-skills": { source } }, null, 2)}\n`);
  }
  fs.writeFileSync(sandbox.settings, `${JSON.stringify(settings, null, 2)}\n`);
  if (agencyToml !== null) {
    if (symlinkToml) {
      fs.mkdirSync(path.dirname(sandbox.tomlTarget));
      fs.writeFileSync(sandbox.tomlTarget, agencyToml);
      fs.symlinkSync(sandbox.tomlTarget, sandbox.toml);
    } else {
      fs.writeFileSync(sandbox.toml, agencyToml);
    }
  }
  if (agencyBak !== null) fs.writeFileSync(`${sandbox.toml}.bak`, agencyBak);
  for (const [file, content] of [[sandbox.oldBinding, oldBinding], [sandbox.newBinding, newBinding]]) {
    if (content === null) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  let searchPath = `${bin}${path.delimiter}${process.env.PATH}`;
  if (!claude) {
    // A PATH holding only the tools the blocks use, so no real claude can be found.
    const tools = path.join(root, "tools");
    fs.mkdirSync(tools);
    for (const tool of BLOCK_TOOLS) {
      const found = which(tool);
      if (found) fs.symlinkSync(found, path.join(tools, tool));
    }
    searchPath = `${bin}${path.delimiter}${tools}`;
  }
  sandbox.env = {
    ...process.env,
    PATH: searchPath,
    HOME: home,
    CLAUDE_CONFIG_DIR: cfg,
    AGENCY_TOML: sandbox.toml,
    FAKE_CLAUDE_LOG: sandbox.log,
    FAKE_CLAUDE_STATE: sandbox.state,
    FAKE_CLAUDE_FAIL: fail,
    FAKE_CLAUDE_NO_DEPS: noDeps ? "1" : "",
  };
  // Guard: never let a migration block reach the operator's real CLI or configuration.
  const resolved = spawnSync(BASH, ["-c", "command -v claude"], { env: sandbox.env, encoding: "utf8" });
  assert.equal(resolved.stdout.trim(), claude ? sandbox.fakeClaude : "", "only the fake claude may be reachable");
  for (const key of ["HOME", "CLAUDE_CONFIG_DIR", "AGENCY_TOML"]) {
    assert.ok(sandbox.env[key].startsWith(root), `${key} must point into the sandbox`);
  }
  return sandbox;
}

function run(sandbox, script) {
  return spawnSync(BASH, ["-c", script], { cwd: sandbox.root, env: sandbox.env, encoding: "utf8" });
}

// The session-start-migrations driver: Detect, then Safety check, Migrate and Announce when Detect fires.
function drive(sandbox, blocks) {
  if (run(sandbox, blocks.Detect).status !== 0) return { fired: false };
  const safety = run(sandbox, blocks["Safety check"]);
  assert.equal(safety.status, 0, safety.stdout + safety.stderr);
  const migrate = run(sandbox, blocks.Migrate);
  return { fired: true, migrate, announce: migrate.status === 0 ? blocks.Announce : null };
}

function calls(sandbox) {
  return fs.readFileSync(sandbox.log, "utf8").split("\n").filter(Boolean);
}

function mutatingCalls(sandbox) {
  return calls(sandbox).filter((line) => !/^plugin list/u.test(line));
}

function installedIds(sandbox) {
  return fs.readFileSync(sandbox.state, "utf8").split("\n").filter(Boolean).sort();
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function json(file) {
  return JSON.parse(read(file));
}

const tests = [];
function test(name, body) {
  tests.push({ name, body });
}

const migrationFiles = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".md")).sort()
  : [];

test("Desk ships the move-to-ourostack-desk migration", () => {
  assert.ok(migrationFiles.includes(`${MOVE_ID}.md`), `plugins/desk/migrations/${MOVE_ID}.md is missing`);
});

for (const name of migrationFiles) {
  test(`${name} follows the migration file format`, () => {
    parseMigration(path.join(migrationsDir, name));
  });
}

function moveMigration() {
  const migration = parseMigration(MOVE_FILE);
  assert.equal(migration.frontmatter.needs_restart, "true");
  return migration.blocks;
}

function withSandbox(options, body) {
  const sandbox = makeSandbox(options);
  try {
    body(sandbox);
    assert.equal(fs.existsSync(path.join(sandbox.home, ".claude")), false, "CLAUDE_CONFIG_DIR must be honored instead of ~/.claude");
  } finally {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  }
}

const OLD_BINDING = '{"schema_version":1,"desk":{"root":"/tmp/old-desk"}}\n';
const V2 = (name, ref = "v2-alpha") => `github:ourostack/ouroboros-skills:plugins/${name}@${ref}`;
const MOVED = (name) => `github:ourostack/desk:plugins/${name}@main`;
const toml = (coordinates) => coordinates.map((coordinate) => `[[plugins.default]]\nplugin = "${coordinate}"\n`).join("\n");
const V1_LINES = [
  "github:ourostack/ouroboros-skills:plugins/desk@main",
  "github:ourostack/ouroboros-skills:plugins/crew",
  "github:ourostack/ouroboros-skills:plugins/work-suite@v2-alpha",
  "github:ourostack/ouroboros-skills:plugins/desk@v2-alpha-old",
  "github:example/other:plugins/unrelated@main",
];
const OLD_TOML = toml([V2("desk"), V2("superpowers"), V2("plain-language"), V2("crew"), ...V1_LINES]);
const NEW_TOML = toml([MOVED("desk"), MOVED("superpowers"), MOVED("plain-language"), MOVED("crew"), ...V1_LINES]);
const USER_BAK = "# the user's own agency.toml.bak\n";
const V2_CLAUDE = ["desk@ouroboros-skills", "superpowers@ouroboros-skills", "plain-language@ouroboros-skills"];

test("a V2 Claude and Agency user moves to ourostack/desk and loses nothing", () => {
  const blocks = moveMigration();
  withSandbox({
    installed: [...V2_CLAUDE, "crew@ouroboros-skills project"],
    oldRef: "v2-alpha",
    agencyToml: OLD_TOML,
    agencyBak: USER_BAK,
    oldBinding: OLD_BINDING,
  }, (sandbox) => {
    const first = drive(sandbox, blocks);
    assert.ok(first.fired, "Detect must fire for a V2 install");
    assert.equal(first.migrate.status, 0, first.migrate.stdout + first.migrate.stderr);
    assert.deepEqual(mutatingCalls(sandbox), [
      "plugin marketplace add ourostack/desk",
      "plugin marketplace update ourostack",
      "plugin install --scope user desk@ourostack",
      "plugin install --scope project crew@ourostack",
      "plugin uninstall --scope project --keep-data crew@ouroboros-skills",
      "plugin uninstall --scope user --keep-data desk@ouroboros-skills",
      "plugin uninstall --scope user --keep-data superpowers@ouroboros-skills",
      "plugin uninstall --scope user --keep-data plain-language@ouroboros-skills",
      "plugin marketplace remove ouroboros-skills",
    ], "Migrate must issue the Claude plugin commands in order");
    assert.deepEqual(installedIds(sandbox), [
      "crew@ourostack project",
      "desk@ourostack user",
      "plain-language@ourostack user",
      "superpowers@ourostack user",
    ], "Desk and its companions, including Crew, must come back from ourostack");

    const settings = json(sandbox.settings);
    assert.deepEqual(settings.extraKnownMarketplaces, {
      ourostack: { source: { source: "github", repo: "ourostack/desk" }, autoUpdate: true },
    }, "the new marketplace keeps automatic updates and the old one is gone");
    assert.equal(settings.autoMemoryEnabled, false, "other settings are preserved");
    assert.equal(settings.hooks.SessionStart[0].hooks[0].command, "echo mine", "other settings are preserved");

    assert.equal(read(sandbox.newBinding), OLD_BINDING, "the desk binding carries over to desk-ourostack");
    assert.equal(read(sandbox.oldBinding), OLD_BINDING, "the old binding is copied, not moved");

    assert.equal(read(sandbox.toml), NEW_TOML, "only @v2-alpha coordinates move; V1 and other entries stay");
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML, "the backup holds the original agency.toml");
    assert.equal(read(`${sandbox.toml}.bak`), USER_BAK, "the user's own agency.toml.bak is untouched");

    assert.match(first.announce, /^Desk moved to ourostack\/desk\./u);
    assert.match(first.announce, /Restart this session/u);

    // A second session: Detect stays quiet, so Migrate never runs again.
    fs.writeFileSync(sandbox.log, "");
    assert.equal(drive(sandbox, blocks).fired, false, "Detect must not fire after the move");
    assert.deepEqual(mutatingCalls(sandbox), []);
    // Even run directly, a second Migrate changes nothing.
    const again = run(sandbox, blocks.Migrate);
    assert.equal(again.status, 0, again.stderr);
    assert.deepEqual(mutatingCalls(sandbox), [], "a second Migrate is a no-op");
    assert.equal(read(sandbox.toml), NEW_TOML);
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML);
  });
});

test("a failed uninstall stops with a clear message, keeps the backup and converges once fixed", () => {
  const blocks = moveMigration();
  withSandbox({
    installed: [...V2_CLAUDE],
    oldRef: "v2-alpha",
    agencyToml: OLD_TOML,
    oldBinding: OLD_BINDING,
    fail: "^plugin uninstall .*desk@ouroboros-skills$",
  }, (sandbox) => {
    const first = drive(sandbox, blocks);
    assert.ok(first.fired);
    assert.notEqual(first.migrate.status, 0, "Migrate must report the failure to the driver");
    assert.match(first.migrate.stderr, /could not uninstall: desk@ouroboros-skills\. Uninstall each with 'claude plugin uninstall <plugin>'/u);
    assert.ok(!mutatingCalls(sandbox).includes("plugin marketplace remove ouroboros-skills"), "the old marketplace stays while an old plugin remains");
    assert.equal(read(sandbox.toml), NEW_TOML);
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML);

    // Before the next session a dotfiles sync brings an old coordinate back.
    const synced = `${OLD_TOML}# synced from dotfiles\n`;
    fs.writeFileSync(sandbox.toml, synced);
    // desk@ouroboros-skills is still there, so Detect fires again and Migrate reports the same failure.
    const second = drive(sandbox, blocks);
    assert.ok(second.fired, "Detect keeps firing while the old Desk is installed");
    assert.notEqual(second.migrate.status, 0);
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML, "a rerun never overwrites the original backup");
    assert.equal(read(sandbox.toml), `${NEW_TOML}# synced from dotfiles\n`);

    // Once the uninstall works, the next session finishes the move and Detect goes quiet.
    sandbox.env.FAKE_CLAUDE_FAIL = "";
    const third = drive(sandbox, blocks);
    assert.equal(third.migrate.status, 0, third.migrate.stderr);
    assert.deepEqual(installedIds(sandbox), ["desk@ourostack user", "plain-language@ourostack user", "superpowers@ourostack user"]);
    assert.equal(drive(sandbox, blocks).fired, false);
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML);
  });
});

test("the ouroboros-skills marketplace stays while Work Suite is installed from it", () => {
  const blocks = moveMigration();
  withSandbox({
    installed: [...V2_CLAUDE, "work-suite@ouroboros-skills", "ponytail-upstream@ouroboros-skills"],
    oldRef: "v2-alpha",
  }, (sandbox) => {
    const result = drive(sandbox, blocks);
    assert.equal(result.migrate.status, 0, result.migrate.stderr);
    assert.ok(!mutatingCalls(sandbox).includes("plugin marketplace remove ouroboros-skills"));
    assert.deepEqual(installedIds(sandbox), [
      "desk@ourostack user",
      "plain-language@ourostack user",
      "ponytail-upstream@ouroboros-skills user",
      "superpowers@ourostack user",
      "work-suite@ouroboros-skills user",
    ]);
    assert.ok(json(sandbox.settings).extraKnownMarketplaces["ouroboros-skills"], "the old marketplace entry stays");
    assert.equal(drive(sandbox, blocks).fired, false);
  });
});

test("Superpowers and Plain Language are installed explicitly when Desk does not pull them in", () => {
  const blocks = moveMigration();
  withSandbox({ installed: V2_CLAUDE, oldRef: "v2-alpha", noDeps: true }, (sandbox) => {
    const result = drive(sandbox, blocks);
    assert.equal(result.migrate.status, 0, result.migrate.stderr);
    assert.deepEqual(installedIds(sandbox), ["desk@ourostack user", "plain-language@ourostack user", "superpowers@ourostack user"]);
  });
});

test("an existing desk-ourostack binding is never overwritten", () => {
  const blocks = moveMigration();
  const newer = '{"schema_version":1,"desk":{"root":"/tmp/new-desk"}}\n';
  withSandbox({ installed: V2_CLAUDE, oldRef: "v2-alpha", oldBinding: OLD_BINDING, newBinding: newer }, (sandbox) => {
    const result = drive(sandbox, blocks);
    assert.equal(result.migrate.status, 0, result.migrate.stderr);
    assert.equal(read(sandbox.newBinding), newer);
    assert.equal(fs.existsSync(sandbox.toml), false, "Migrate must not create agency.toml");
  });
});

test("V1 installs are never moved", () => {
  const blocks = moveMigration();
  const v1Toml = toml(V1_LINES);
  for (const oldRef of ["main", null]) {
    withSandbox({ installed: V2_CLAUDE, oldRef, agencyToml: v1Toml }, (sandbox) => {
      assert.equal(run(sandbox, blocks.Detect).status, 1, `Detect must not fire for a marketplace on ${oldRef ?? "no ref"}`);
      const migrate = run(sandbox, blocks.Migrate);
      assert.equal(migrate.status, 0, migrate.stderr);
      assert.deepEqual(mutatingCalls(sandbox), [], "Migrate must leave a V1 Claude install alone");
      assert.equal(read(sandbox.toml), v1Toml, "@main, no-ref and other coordinates stay untouched");
      assert.equal(fs.existsSync(`${sandbox.toml}.pre-ourostack-desk`), false);
    });
  }
});

test("an Agency user without Claude Code moves, and a symlinked agency.toml stays a symlink", () => {
  const blocks = moveMigration();
  withSandbox({ claude: false, agencyToml: OLD_TOML, agencyBak: USER_BAK, symlinkToml: true }, (sandbox) => {
    const result = drive(sandbox, blocks);
    assert.ok(result.fired, "Detect must fire on agency.toml alone");
    assert.equal(result.migrate.status, 0, result.migrate.stderr);
    assert.ok(fs.lstatSync(sandbox.toml).isSymbolicLink(), "agency.toml must stay a symlink");
    assert.equal(read(sandbox.tomlTarget), NEW_TOML, "the symlink target holds the rewrite");
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML);
    assert.equal(read(`${sandbox.toml}.bak`), USER_BAK);
    assert.deepEqual(calls(sandbox), [], "no claude exists to call");
    assert.equal(drive(sandbox, blocks).fired, false);
  });
});

test("an Agency user with Claude Code but no V2 Claude install changes only agency.toml", () => {
  const blocks = moveMigration();
  withSandbox({ agencyToml: OLD_TOML }, (sandbox) => {
    const result = drive(sandbox, blocks);
    assert.equal(result.migrate.status, 0, result.migrate.stderr);
    assert.deepEqual(mutatingCalls(sandbox), []);
    assert.equal(read(sandbox.toml), NEW_TOML);
    assert.equal(drive(sandbox, blocks).fired, false);
  });
});

test("a machine already on ourostack/desk, or with no Desk, never runs the migration", () => {
  const blocks = moveMigration();
  withSandbox({ installed: ["desk@ourostack", "superpowers@ourostack", "plain-language@ourostack"], agencyToml: toml([MOVED("desk")]) }, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 1);
  });
  withSandbox({}, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 1);
  });
});

// The startup hooks name the migration file only on the old channel; the new home never carries the line.
function hookContexts() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "desk-migration-hooks-"));
  try {
    const env = {
      ...process.env,
      HOME: path.join(scratch, "home"),
      DESK: scratch,
      CLAUDE_PLUGIN_ROOT: deskRoot,
      PLUGIN_ROOT: deskRoot,
    };
    fs.mkdirSync(env.HOME);
    const claude = spawnSync(BASH, [path.join(deskRoot, "hooks", "session-start.sh")], { cwd: scratch, env, encoding: "utf8" });
    assert.equal(claude.status, 0, claude.stderr);
    const copilot = spawnSync(process.execPath, [path.join(deskRoot, "hooks", "copilot-session-start.cjs")], { cwd: scratch, env, encoding: "utf8" });
    assert.equal(copilot.status, 0, copilot.stderr);
    return {
      claude: JSON.parse(claude.stdout).hookSpecificOutput.additionalContext,
      copilot: JSON.parse(copilot.stdout).additionalContext,
    };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

const marketplace = json(path.join(repoRoot, ".claude-plugin", "marketplace.json"));
test(`startup hooks ${marketplace.name === "ouroboros-skills" ? "open with the move line and the migration's path" : "never carry the move line"}`, () => {
  for (const [host, context] of Object.entries(hookContexts())) {
    if (marketplace.name === "ouroboros-skills") {
      assert.equal(context.split("\n")[0], MOVE_LINE, `${host} startup must open with the move line naming the migration file`);
      assert.equal(context.split(MOVE_LINE).length - 1, 1, `${host} startup must carry the move line once`);
    } else {
      assert.doesNotMatch(context, /Desk has moved/u, `${host} startup must not tell users on the new home to move`);
    }
  }
});

let failures = 0;
for (const { name, body } of tests) {
  try {
    body();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`not ok - ${name}\n  ${String(error.message).split("\n").join("\n  ")}`);
  }
}
console.log(failures === 0 ? `Desk migrations: ${tests.length} checks passed.` : `Desk migrations: ${failures} of ${tests.length} checks failed.`);
process.exitCode = failures === 0 ? 0 : 1;
