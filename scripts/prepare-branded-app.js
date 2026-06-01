const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const electronApp = path.join(root, "node_modules", "electron", "dist", "Electron.app");
const outDir = path.join(root, "dist");
const outApp = path.join(outDir, "AgentCLI.app");
const plist = path.join(outApp, "Contents", "Info.plist");
const resources = path.join(outApp, "Contents", "Resources");
const sourceIcon = path.join(root, "assets", "icon.icns");
const targetIcon = path.join(resources, "AgentCLI.icns");

if (!fs.existsSync(electronApp)) {
  throw new Error(`Electron.app not found at ${electronApp}. Run npm install first.`);
}

fs.rmSync(outApp, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync("/usr/bin/ditto", [electronApp, outApp]);
fs.copyFileSync(sourceIcon, targetIcon);

function setPlist(key, value) {
  execFileSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, plist]);
}

setPlist("CFBundleName", "AgentCLI");
setPlist("CFBundleDisplayName", "AgentCLI");
setPlist("CFBundleIdentifier", "app.agentcli.desktop");
setPlist("CFBundleIconFile", "AgentCLI.icns");
setPlist("CFBundleShortVersionString", "0.0.1");
setPlist("CFBundleVersion", "0.0.1");

console.log(outApp);
