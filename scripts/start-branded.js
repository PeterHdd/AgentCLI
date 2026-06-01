const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const prepare = spawnSync(process.execPath, [path.join(root, "scripts", "prepare-branded-app.js")], {
  cwd: root,
  encoding: "utf8"
});

if (prepare.status !== 0) {
  process.stderr.write(prepare.stderr || prepare.stdout);
  process.exit(prepare.status || 1);
}

const appPath = prepare.stdout.trim().split("\n").at(-1);
const result = spawnSync("open", ["-n", appPath, "--args", root], {
  cwd: root,
  stdio: "inherit"
});

process.exit(result.status || 0);
