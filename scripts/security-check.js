const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const main = read("src/main.js");
const preload = read("src/preload.js");
const html = read("src/renderer/index.html");
const renderer = read("src/renderer/renderer.js");

function assertContains(source, pattern, message) {
  assert.match(source, pattern, message);
}

function assertMissing(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

assertContains(main, /contextIsolation:\s*true/, "BrowserWindow must enable contextIsolation");
assertContains(main, /nodeIntegration:\s*false/, "BrowserWindow must disable nodeIntegration");
assertContains(main, /sandbox:\s*true/, "BrowserWindow must enable renderer sandboxing");
assertContains(main, /setWindowOpenHandler\(\(\)\s*=>\s*\(\{\s*action:\s*"deny"\s*\}\)\)/, "new windows must be denied");
assertContains(main, /will-navigate[\s\S]+event\.preventDefault\(\)/, "renderer navigation must be blocked");
assertContains(main, /permission === "media" && details\?\.mediaTypes\?\.includes\("audio"\)/, "media permission must be audio-only");
assertContains(main, /function isTrustedSender/, "IPC must validate sender origin");
assertContains(main, /function handle\(channel, listener\)/, "IPC handlers must use trusted wrapper");
assert.equal((main.match(/ipcMain\.handle\(/g) || []).length, 1, "Only the trusted handle wrapper may call ipcMain.handle");
assertContains(main, /function shellQuote/, "shell command lookup must quote arguments");
assertContains(main, /function assertSafeCommand/, "provider commands must be validated");
assertContains(main, /25 \* 1024 \* 1024/, "voice transcription must bound audio input size");

assertContains(preload, /contextBridge\.exposeInMainWorld\("agentcli"/, "preload should expose the AgentCLI API");
assertMissing(preload, /exposeInMainWorld\([^)]*ipcRenderer/, "preload must not expose ipcRenderer");
assertMissing(preload, /exposeInMainWorld\([^)]*electron/, "preload must not expose Electron primitives");

assertContains(html, /Content-Security-Policy/, "renderer HTML must declare a CSP");
assertContains(html, /script-src 'self'/, "renderer CSP must keep scripts locked to local files");
assertContains(html, /style-src 'self' 'unsafe-inline'/, "xterm needs inline styles for ANSI colors and prompt backgrounds");
assertContains(html, /connect-src 'none'/, "renderer CSP should block network connections");
assertMissing(html, /<webview/i, "renderer must not use webview");

assertMissing(renderer, /\beval\s*\(/, "renderer must not use eval");
assertMissing(renderer, /\bFunction\s*\(/, "renderer must not use Function constructor");

console.log("security checks passed");
