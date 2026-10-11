// Playlist Progress Saver — per-player IINA plugin entry point.
// This plugin uses mpv's unload hook and does not intercept key bindings or
// mutate any of IINA's built-in playlist navigation actions.
(() => {
  'use strict';

  const { mpv, preferences } = iina;

  function saveBeforePlaylistSwitch() {
    if (preferences.get('enabled') !== true) return;

    // IINA's "Resume last playback position" preference controls both flags.
    // Respect that setting rather than silently re-enabling persistence.
    if (!mpv.getFlag('save-position-on-quit') ||
        !mpv.getFlag('resume-playback')) return;

    if (mpv.getFlag('eof-reached')) return;

    // mpv changes playlist-pos when the user selects Next / Previous / another
    // entry, while playlist-playing-pos continues to identify the old file
    // until it is unloaded. This distinction lets us avoid writing on quit,
    // stop, automatic EOF, or a reload of the same entry.
    const playing = mpv.getNumber('playlist-playing-pos');
    const selected = mpv.getNumber('playlist-pos');
    const count = mpv.getNumber('playlist-count');
    if (!Number.isInteger(playing) || playing < 0 ||
        !Number.isInteger(selected) || selected < 0 ||
        !Number.isInteger(count) || count < 2 ||
        playing === selected) return;

    // A file that never began playing may not have a valid resume position.
    const seconds = mpv.getNumber('time-pos');
    if (!Number.isFinite(seconds) || seconds <= 0) return;

    // on_unload runs before mpv releases its current media state, so this
    // writes the *old* item's position without interfering with navigation.
    mpv.command('write-watch-later-config', []);
  }

  mpv.addHook('on_unload', 50, () => {
    try {
      saveBeforePlaylistSwitch();
    } catch (err) {
      iina.console.error(`Playlist Progress Saver: ${String(err)}`);
    }
  });
})();
