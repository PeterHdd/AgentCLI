const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("package is branded as agentcli", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.name, "agentcli");
  assert.equal(pkg.productName, "AgentCLI");
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "version should be semver (release-please bumps it)");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.build.mac.icon, "assets/icon.icns");
  assert.equal(pkg.build.mac.target[0].target, "dmg");
  assert.equal(pkg.build.directories.output, "release");
  assert.equal(pkg.main, "src/main.js");
  assert.ok(pkg.scripts.check);
  assert.ok(pkg.scripts.test);
  assert.ok(pkg.scripts.ci);
  assert.ok(pkg.scripts["start:branded"]);
  assert.ok(pkg.scripts["app:prepare"]);
  assert.ok(pkg.scripts["dist:dir"]);
  assert.ok(pkg.scripts["dist:dir:arm64"]);
  assert.ok(pkg.scripts["dist:dir:x64"]);
  assert.ok(pkg.scripts["dist:dmg"]);
  assert.ok(pkg.scripts["dist:dmg:arm64"]);
  assert.ok(pkg.scripts["dist:dmg:x64"]);
  assert.ok(pkg.scripts["dist:dmg:all"]);
  assert.match(pkg.scripts["dist:dmg:x64"], /--x64/);
  assert.match(pkg.scripts["dist:dmg:arm64"], /--arm64/);
});

test("preload exposes the agentcli bridge only", () => {
  const preload = read("src/preload.js");
  assert.match(preload, /exposeInMainWorld\("agentcli"/);
  assert.doesNotMatch(preload, /exposeInMainWorld\("agentic"/);
  assert.match(preload, /chooseGitRepo/);
  assert.match(preload, /createGitWorktree/);
  assert.match(preload, /removeGitWorktree/);
});

test("renderer uses agentcli storage and migrates legacy storage", () => {
  const renderer = read("src/renderer/renderer.js");
  assert.match(renderer, /migrateLocalStorageNamespace\(\)/);
  assert.match(renderer, /agentcli\.workspaceLayout/);
  assert.match(renderer, /agentcli\.worktreeRepoPath/);
  assert.match(renderer, /openGitWorktreeAgent/);
  assert.match(renderer, /Nerd Font/);
  assert.doesNotMatch(renderer, /window\.agentic/);
});

test("agent PTYs force color and strip NO_COLOR", () => {
  const main = read("src/main.js");
  assert.match(main, /TERM:\s*"xterm-256color"/);
  assert.match(main, /COLORTERM:\s*"truecolor"/);
  assert.match(main, /CLICOLOR_FORCE:\s*"1"/);
  assert.match(main, /delete shellEnv\.NO_COLOR/);
});

test("native menu exposes app actions without user-facing devtools", () => {
  const main = read("src/main.js");
  assert.match(main, /const APP_NAME = "AgentCLI"/);
  assert.match(main, /const APP_VERSION = packageJson\.version/);
  assert.match(main, /app\.setName\(APP_NAME\)/);
  assert.match(main, /app\.setVersion\(APP_VERSION\)/);
  assert.match(main, /app\.dock\.setIcon/);
  assert.match(main, /icon:\s*iconPath/);
  assert.match(main, /About \$\{APP_NAME\}/);
  assert.match(main, /label:\s*"Worktrees"/);
  assert.match(main, /git:choose-repo/);
  assert.match(main, /git:create-worktree/);
  assert.match(main, /git:remove-worktree/);
  assert.match(main, /execFileSync\(gitPath\(\)/);
  assert.match(main, /label:\s*"Theme Editor"/);
  assert.match(main, /ui:run-action/);
  assert.doesNotMatch(main, /toggleDevTools/);
});

test("branded dev app patches Electron bundle identity", () => {
  const script = read("scripts/prepare-branded-app.js");
  assert.match(script, /AgentCLI\.app/);
  assert.match(script, /CFBundleName", "AgentCLI"/);
  assert.match(script, /CFBundleDisplayName", "AgentCLI"/);
  assert.match(script, /CFBundleIdentifier", "app\.agentcli\.desktop"/);
  assert.match(script, /CFBundleIconFile", "AgentCLI\.icns"/);
});

test("release files document alpha distribution", () => {
  const changelog = read("CHANGELOG.md");
  const gitignore = read(".gitignore");
  const releaseWorkflow = read(".github/workflows/release.yml");
  const releasePleaseWorkflow = read(".github/workflows/release-please.yml");
  const releasePleaseConfig = JSON.parse(read("release-please-config.json"));
  const releasePleaseManifest = JSON.parse(read(".release-please-manifest.json"));
  const pkg = JSON.parse(read("package.json"));
  assert.match(changelog, /## 0\.0\.1 - 2026-05-31/);
  assert.match(changelog, /DMGs are unsigned and not notarized/);
  assert.match(gitignore, /node_modules\//);
  assert.match(gitignore, /release\//);
  assert.match(releaseWorkflow, /matrix:/);
  assert.match(releaseWorkflow, /arch: \[arm64, x64\]/);
  assert.match(releaseWorkflow, /gh release upload/);
  assert.match(releasePleaseWorkflow, /googleapis\/release-please-action@v4/);
  assert.equal(releasePleaseConfig["release-type"], "node");
  assert.equal(releasePleaseConfig.packages["."]["changelog-path"], "CHANGELOG.md");
  assert.match(releasePleaseManifest["."], /^\d+\.\d+\.\d+$/, "manifest version should be semver");
  assert.equal(releasePleaseManifest["."], pkg.version, "manifest must stay in sync with package.json version");
});
