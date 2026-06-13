const assert = require("node:assert/strict");
const test = require("node:test");

const colors = require("../src/renderer/lib/colors.js");
const format = require("../src/renderer/lib/format.js");
const { detectsInteractiveAgent } = require("../src/renderer/lib/agent.js");

test("color hex/rgb conversion round-trips", () => {
  assert.deepEqual(colors.hexToRgb("#8caaee"), { r: 140, g: 170, b: 238 });
  assert.equal(colors.rgbToHex(140, 170, 238), "#8caaee");
  // short hex expands
  assert.deepEqual(colors.hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
  // rgbToHex clamps out-of-range channels
  assert.equal(colors.rgbToHex(-20, 300, 128), "#00ff80");
});

test("hsb round-trips closely and handles greys", () => {
  for (const hex of ["#8caaee", "#a6d189", "#e78284", "#252936"]) {
    const { h, s, b } = colors.hexToHsb(hex);
    const back = colors.hexToHsb(colors.hsbToHex(h, s, b));
    assert.ok(Math.abs(back.h - h) <= 2, `hue ${hex}`);
    assert.ok(Math.abs(back.s - s) <= 2, `sat ${hex}`);
    assert.ok(Math.abs(back.b - b) <= 2, `bri ${hex}`);
  }
  assert.deepEqual(colors.hexToHsb("#000000"), { h: 0, s: 0, b: 0 });
});

test("mixHex blends by ratio", () => {
  assert.equal(colors.mixHex("#000000", "#ffffff", 0), "#ffffff");
  assert.equal(colors.mixHex("#000000", "#ffffff", 1), "#000000");
  assert.equal(colors.mixHex("#000000", "#ffffff", 0.5), "#808080");
});

test("escapeHtml escapes the dangerous characters", () => {
  assert.equal(format.escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  assert.equal(format.escapeHtml(42), "42");
});

test("normalizedTimestamp upscales seconds to milliseconds", () => {
  assert.equal(format.normalizedTimestamp(0), 0);
  assert.equal(format.normalizedTimestamp(1_700_000_000), 1_700_000_000_000);
  assert.equal(format.normalizedTimestamp(1_700_000_000_000), 1_700_000_000_000);
});

test("workspaceLabel reduces a path to its basename", () => {
  assert.equal(format.workspaceLabel("/Users/p.haddad/digital-oneapp"), "digital-oneapp");
  assert.equal(format.workspaceLabel("/Users/p.haddad/digital-oneapp/"), "digital-oneapp");
  assert.equal(format.workspaceLabel(""), "unknown workspace");
  assert.equal(format.workspaceLabel("unknown workspace"), "unknown workspace");
});

test("formatThreadDate shows time today and a date otherwise", () => {
  const now = new Date(2026, 5, 12, 15, 0, 0); // 12 Jun 2026
  const todaySeconds = Math.floor(new Date(2026, 5, 12, 9, 30, 0).getTime() / 1000);
  assert.match(format.formatThreadDate(todaySeconds, now), /\d/);
  assert.doesNotMatch(format.formatThreadDate(todaySeconds, now), /Jun|Jan/);
  const earlierSeconds = Math.floor(new Date(2026, 0, 4, 9, 30, 0).getTime() / 1000);
  assert.match(format.formatThreadDate(earlierSeconds, now), /Jan/);
  assert.equal(format.formatThreadDate(0, now), "");
});

test("detectsInteractiveAgent only fires for interactive launches", () => {
  assert.equal(detectsInteractiveAgent("claude"), "claude");
  assert.equal(detectsInteractiveAgent("codex"), "codex");
  assert.equal(detectsInteractiveAgent("claude --model opus"), "claude");
  assert.equal(detectsInteractiveAgent("codex resume abc123"), "codex");
  // one-shot / non-interactive forms must not hijack the tab
  assert.equal(detectsInteractiveAgent("claude --version"), null);
  assert.equal(detectsInteractiveAgent("claude -p \"hi\""), null);
  assert.equal(detectsInteractiveAgent("codex login"), null);
  assert.equal(detectsInteractiveAgent("codex mcp list"), null);
  assert.equal(detectsInteractiveAgent("git commit -m claude"), null);
  assert.equal(detectsInteractiveAgent("ls"), null);
});
