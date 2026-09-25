#!/usr/bin/env node
"use strict";

// Exercises Desk's session-start migrations without touching a real Claude or
// Agency configuration. A fake `claude` placed first on PATH records every call
// and answers `plugin list` from a state file this test controls; HOME,
// CLAUDE_CONFIG_DIR and AGENCY_TOML all point into a temporary directory.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const deskRoot = path.join(repoRoot, "plugins", "desk");
const migrationsDir = path.join(deskRoot, "migrations");
const MOVE_ID = "01-move-to-ourostack-desk";
const MOVE_LINE = "Desk has moved to ourostack/desk. Run the move-to-ourostack-desk migration now (desk:session-start-migrations).";
const SECTIONS = ["Detect", "Safety check", "Migrate", "Announce"];
const OLD_PLUGINS = ["desk", "superpowers", "plain-language", "crew"];

const FAKE_CLAUDE = `#!/usr/bin/env bash
# Test double for the Claude Code CLI. Records every call and keeps the
# installed plugin list in a state file, in the real CLI's list format.
printf '%s\\n' "$*" >> "$FAKE_CLAUDE_LOG"
state="$FAKE_CLAUDE_STATE"
touch "$state"
case "$1:$2" in
  plugin:list)
    if [ ! -s "$state" ]; then echo "No plugins installed."; exit 0; fi
    printf 'Installed plugins:\\n\\n'
    while IFS= read -r id; do
      [ -n "$id" ] || continue
      printf '  \\342\\235\\257 %s\\n    Version: 0.0.0\\n    Scope: user\\n    Status: \\342\\234\\224 enabled\\n\\n' "$id"
    done < "$state"
    ;;
  plugin:install)
    grep -qxF "$3" "$state" || printf '%s\\n' "$3" >> "$state"
    ;;
  plugin:uninstall)
    grep -qxF "$3" "$state" || { echo "Plugin \\"$3\\" is not installed" >&2; exit 1; }
    grep -vxF "$3" "$state" > "$state.next"
    mv "$state.next" "$state"
    ;;
  plugin:marketplace)
    ;;
  *)
    echo "fake claude: unexpected arguments: $*" >&2
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
    const fence = /^```bash\n([\s\S]*?)\n```$/u.exec(body);
    assert.ok(fence && !fence[1].includes("```"), `${stem}: section ${heading} must hold exactly one fenced bash block`);
    blocks[heading] = fence[1];
  }
  assert.deepEqual(headings, SECTIONS, `${stem}: sections must be ${SECTIONS.join(", ")} in that order`);
  return { frontmatter, blocks };
}

function makeSandbox({ installed = [], agencyToml = null, oldBinding = null, newBinding = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "desk-migration-"));
  const bin = path.join(root, "bin");
  const home = path.join(root, "home");
  const cfg = path.join(root, "claude-config");
  fs.mkdirSync(bin);
  fs.mkdirSync(home);
  fs.mkdirSync(cfg);
  const sandbox = {
    root,
    fakeClaude: path.join(bin, "claude"),
    state: path.join(root, "claude-installed.txt"),
    log: path.join(root, "claude-calls.log"),
    toml: path.join(root, "agency.toml"),
    oldBinding: path.join(cfg, "plugins", "data", "desk-ouroboros-skills", "desk.activation.json"),
    newBinding: path.join(cfg, "plugins", "data", "desk-ourostack", "desk.activation.json"),
  };
  fs.writeFileSync(sandbox.fakeClaude, FAKE_CLAUDE, { mode: 0o755 });
  // The Safety check requires gh; a stub keeps the test independent of the runner's tools.
  fs.writeFileSync(path.join(bin, "gh"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
  fs.writeFileSync(sandbox.state, installed.map((id) => `${id}\n`).join(""));
  fs.writeFileSync(sandbox.log, "");
  if (agencyToml !== null) fs.writeFileSync(sandbox.toml, agencyToml);
  for (const [file, content] of [[sandbox.oldBinding, oldBinding], [sandbox.newBinding, newBinding]]) {
    if (content === null) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  sandbox.env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    HOME: home,
    CLAUDE_CONFIG_DIR: cfg,
    AGENCY_TOML: sandbox.toml,
    FAKE_CLAUDE_LOG: sandbox.log,
    FAKE_CLAUDE_STATE: sandbox.state,
  };
  // Guard: never let a migration block reach the operator's real CLI or configuration.
  const resolved = spawnSync("bash", ["-c", "command -v claude"], { env: sandbox.env, encoding: "utf8" });
  assert.equal(resolved.stdout.trim(), sandbox.fakeClaude, "the fake claude must shadow any real claude on PATH");
  for (const key of ["HOME", "CLAUDE_CONFIG_DIR", "AGENCY_TOML"]) {
    assert.ok(sandbox.env[key].startsWith(root), `${key} must point into the sandbox`);
  }
  return sandbox;
}

function run(sandbox, script) {
  return spawnSync("bash", ["-c", script], { cwd: sandbox.root, env: sandbox.env, encoding: "utf8" });
}

function calls(sandbox) {
  return fs.readFileSync(sandbox.log, "utf8").split("\n").filter(Boolean);
}

function installed(sandbox) {
  return fs.readFileSync(sandbox.state, "utf8").split("\n").filter(Boolean);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const tests = [];
function test(name, body) {
  tests.push({ name, body });
}

// Every migration file in Desk must follow the session-start-migrations format.
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
  const migration = parseMigration(path.join(migrationsDir, `${MOVE_ID}.md`));
  assert.equal(migration.frontmatter.needs_restart, "true");
  return migration.blocks;
}

const OLD_BINDING = '{"schema_version":1,"desk":{"root":"/tmp/old-desk"}}\n';
const OLD_TOML = [
  "[[plugins.default]]",
  'plugin = "github:ourostack/ouroboros-skills:plugins/desk@v2-alpha"',
  "",
  "[[plugins.default]]",
  'plugin = "github:ourostack/ouroboros-skills:plugins/superpowers@v2-alpha"',
  "",
  "[[plugins.default]]",
  'plugin = "github:ourostack/ouroboros-skills:plugins/plain-language@v2-alpha"',
  "",
  "[[plugins.default]]",
  'plugin = "github:ourostack/ouroboros-skills:plugins/crew@refs/heads/v2-alpha"',
  "",
  "[[plugins.default]]",
  'plugin = "github:example/other:plugins/unrelated@main"',
  "",
].join("\n");
const NEW_TOML = OLD_TOML
  .replaceAll("github:ourostack/ouroboros-skills:plugins/desk@v2-alpha", "github:ourostack/desk:plugins/desk@main")
  .replaceAll("github:ourostack/ouroboros-skills:plugins/superpowers@v2-alpha", "github:ourostack/desk:plugins/superpowers@main")
  .replaceAll("github:ourostack/ouroboros-skills:plugins/plain-language@v2-alpha", "github:ourostack/desk:plugins/plain-language@main")
  .replaceAll("github:ourostack/ouroboros-skills:plugins/crew@refs/heads/v2-alpha", "github:ourostack/desk:plugins/crew@main");
const EXPECTED_CLAUDE_MOVE = [
  "plugin list",
  "plugin marketplace add ourostack/desk",
  "plugin install desk@ourostack",
  ...OLD_PLUGINS.map((name) => `plugin uninstall ${name}@ouroboros-skills`),
  "plugin marketplace remove ouroboros-skills",
  "plugin marketplace update ourostack",
];

function withSandbox(options, body) {
  const sandbox = makeSandbox(options);
  try {
    body(sandbox);
  } finally {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  }
}

test("a Claude and Agency user on ouroboros-skills moves to ourostack/desk", () => {
  const blocks = moveMigration();
  withSandbox({
    installed: ["desk@ouroboros-skills", "superpowers@ouroboros-skills", "plain-language@ouroboros-skills"],
    agencyToml: OLD_TOML,
    oldBinding: OLD_BINDING,
  }, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 0, "Detect must fire before the move");
    const safety = run(sandbox, blocks["Safety check"]);
    assert.equal(safety.status, 0, safety.stdout + safety.stderr);

    fs.writeFileSync(sandbox.log, "");
    const migrate = run(sandbox, blocks.Migrate);
    assert.equal(migrate.status, 0, migrate.stdout + migrate.stderr);
    assert.deepEqual(calls(sandbox), EXPECTED_CLAUDE_MOVE, "Migrate must issue the Claude plugin commands in order");
    assert.deepEqual(installed(sandbox), ["desk@ourostack"]);

    assert.equal(read(sandbox.newBinding), OLD_BINDING, "the desk binding must carry over to desk-ourostack");
    assert.equal(read(sandbox.oldBinding), OLD_BINDING, "the old binding is copied, not moved");

    assert.equal(read(sandbox.toml), NEW_TOML, "agency.toml coordinates must move to ourostack/desk@main");
    assert.equal(read(`${sandbox.toml}.pre-ourostack-desk`), OLD_TOML, "agency.toml backup must hold the original");
    assert.equal(fs.existsSync(`${sandbox.toml}.bak`), false, "sed's scratch backup must be removed");

    const announce = run(sandbox, blocks.Announce);
    assert.equal(announce.status, 0);
    assert.match(announce.stdout, /Desk moved to ourostack\/desk\. Restart this session/u);

    assert.equal(run(sandbox, blocks.Detect).status, 1, "Detect must not fire after the move");
  });
});

test("an existing desk-ourostack binding is never overwritten", () => {
  const blocks = moveMigration();
  const newer = '{"schema_version":1,"desk":{"root":"/tmp/new-desk"}}\n';
  withSandbox({
    installed: ["desk@ouroboros-skills"],
    oldBinding: OLD_BINDING,
    newBinding: newer,
  }, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 0);
    const migrate = run(sandbox, blocks.Migrate);
    assert.equal(migrate.status, 0, migrate.stdout + migrate.stderr);
    assert.equal(read(sandbox.newBinding), newer);
    assert.equal(fs.existsSync(sandbox.toml), false, "Migrate must not create agency.toml");
    assert.equal(run(sandbox, blocks.Detect).status, 1);
  });
});

test("an Agency-only user moves without any Claude plugin changes", () => {
  const blocks = moveMigration();
  withSandbox({ agencyToml: OLD_TOML }, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 0, "Detect must fire on agency.toml alone");
    fs.writeFileSync(sandbox.log, "");
    const migrate = run(sandbox, blocks.Migrate);
    assert.equal(migrate.status, 0, migrate.stdout + migrate.stderr);
    assert.deepEqual(calls(sandbox), ["plugin list"], "Migrate must only read the Claude plugin list");
    assert.equal(read(sandbox.toml), NEW_TOML);
    assert.equal(run(sandbox, blocks.Detect).status, 1);
  });
});

test("a machine already on ourostack/desk never runs the migration", () => {
  const blocks = moveMigration();
  withSandbox({
    installed: ["desk@ourostack", "superpowers@ourostack", "plain-language@ourostack"],
    agencyToml: NEW_TOML,
  }, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 1);
  });
  withSandbox({}, (sandbox) => {
    assert.equal(run(sandbox, blocks.Detect).status, 1, "a fresh machine with no Desk must not migrate");
  });
});

// The startup hooks name the migration only on the old channel; the new home never carries the line.
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
    const claude = spawnSync("bash", [path.join(deskRoot, "hooks", "session-start.sh")], { cwd: scratch, env, encoding: "utf8" });
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

const marketplace = JSON.parse(read(path.join(repoRoot, ".claude-plugin", "marketplace.json")));
test(`startup hooks ${marketplace.name === "ouroboros-skills" ? "open with" : "never carry"} the move line`, () => {
  for (const [host, context] of Object.entries(hookContexts())) {
    if (marketplace.name === "ouroboros-skills") {
      assert.equal(context.split("\n")[0], MOVE_LINE, `${host} startup must open with the move line`);
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
