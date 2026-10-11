// Run with: node plugins/tests/playlist-watch-later.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..', 'playlist-watch-later.iinaplugin');
const script = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const info = JSON.parse(fs.readFileSync(path.join(root, 'Info.json'), 'utf8'));
assert.equal(info.preferenceDefaults.enabled, true);
assert.equal(info.entry, 'main.js');

const normal = {
  enabled: true,
  'save-position-on-quit': true,
  'resume-playback': true,
  'eof-reached': false,
  'playlist-playing-pos': 0,
  'playlist-pos': 1,
  'playlist-count': 3,
  'time-pos': 72.25,
};

function run(overrides = {}) {
  const state = { ...normal, ...overrides };
  const commands = [];
  const messages = [];
  let registered = null;
  const mock = {
    mpv: {
      getFlag: (name) => state[name],
      getNumber: (name) => state[name],
      command: (cmd, args) => commands.push([cmd, args]),
      addHook: (name, priority, handler) => {
        registered = { name, priority, handler };
      },
    },
    preferences: { get: (key) => state[key] },
    console: { error: (m) => messages.push(m) },
  };
  vm.runInNewContext(script, { iina: mock });
  assert.equal(registered.name, 'on_unload');
  assert.equal(registered.priority, 50);
  registered.handler();
  return { commands, messages };
}

assert.equal(run().commands.length, 1, 'manual Next should save');
assert.equal(run({ 'playlist-playing-pos': 2, 'playlist-pos': 1 }).commands.length, 1, 'manual Previous should save');

for (const [label, changes] of Object.entries({
  'disabled plugin': { enabled: false },
  'IINA save disabled': { 'save-position-on-quit': false },
  'IINA resume disabled': { 'resume-playback': false },
  'natural EOF': { 'eof-reached': true },
  'same entry/reload or quit': { 'playlist-pos': 0 },
  'stop clears selected': { 'playlist-pos': -1 },
  'unavailable playing entry': { 'playlist-playing-pos': -1 },
  'one-item playlist': { 'playlist-count': 1 },
  'unknown playlist size': { 'playlist-count': NaN },
  'no position': { 'time-pos': NaN },
  'position zero': { 'time-pos': 0 },
  'negative position': { 'time-pos': -1 },
  'fractional selected index': { 'playlist-pos': 1.5 },
})) {
  assert.equal(run(changes).commands.length, 0, label);
}
assert.equal(run({ 'playlist-playing-pos': 1, 'playlist-pos': 1 }).commands.length, 0);

const call = run().commands[0];
assert.equal(call[0], 'write-watch-later-config');
assert.equal(call[1].length, 0);
console.log('PASS: playlist navigation, EOF, stop, quit, resume guards');
