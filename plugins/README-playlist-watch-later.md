# Playlist Progress Saver — IINA plugin

A standalone IINA JavaScript plugin that saves the currently playing
video's `watch_later` resume position when the user manually navigates to
**another** playlist item. It does not modify `PlayerCore.swift` or alter
default behavior for users who do not install it.

## How it works

The plugin subscribes to mpv's synchronous `on_unload` hook (before the old
file's media state is discarded). For explicit playlist navigation, mpv
changes `playlist-pos` to the selected item **before** the current file
finishes unloading, while `playlist-playing-pos` still refers to the
old file. The plugin saves only if both indices are valid and different,
and a non-zero playback position is available.

This avoids extra writes for normal EOF, quit, stop, single-file playback
and reloading the same item. It also honors IINA's
**Resume last playback position** preference; the plugin does not enable
mpv's watch-later feature when that preference is disabled.

The plugin is enabled after installation; a separate on/off control is
available in the plugin's preference page.

## Installation from this development branch (macOS)

```sh
git clone --branch feat/playlist-watch-later-plugin https://github.com/Hlinbit/iina.git
cd iina
mkdir -p "$HOME/Library/Application Support/com.colliderli.iina/plugins"
ln -s "$PWD/plugins/playlist-watch-later.iinaplugin" \
  "$HOME/Library/Application Support/com.colliderli.iina/plugins/playlist-watch-later.iinaplugin-dev"
```

Restart IINA, enable this plugin in **Settings → Plugins**, and ensure
**Settings → General → Resume last playback position** is enabled.
To uninstall, remove the `.iinaplugin-dev` symlink.

The plugin lives under `plugins/` in an IINA source fork, not at the
repository root. Accordingly, **installing the repository URL directly as
an IINA plugin will not work**. Use the symlink instructions above.

## Verification

Run pure-JavaScript mocked API tests (Node.js):

```sh
node plugins/tests/playlist-watch-later.test.js
```

Manual macOS verification:

1. Play video A past 10 seconds, switch to B using Next; reopen A
   separately and verify its saved resume position.
2. Repeat with Previous and clicking a different entry in the playlist.
3. Reload the currently selected item; check no extra save occurs.
4. Disable IINA's Resume last playback position setting. Confirm no extra
   watch-later records are saved by the plugin.
5. Disable this plugin's Enabled switch and repeat navigation. Default mpv
   behavior should return.
6. Confirm normal EOF, stopping, and quitting don't issue extra writes.
7. Reopen a whole playlist after saving multiple video positions. mpv may
   choose an earlier entry with a watch-later record; this is a trade-off
   of retaining per-video progress.

## Limitations

- The solution depends on mpv's documented relationship between
  `playlist-pos` and `playlist-playing-pos` in the unload lifecycle.
  It needs a real IINA/macOS integration test against IINA's bundled mpv.
- Reordering/shuffling/removing playlist items while a video plays can
  modify indices. Such edge cases require manual validation.
- It does not save progress when a video reaches its natural EOF or
  when the same entry is reloaded.
- This is a plugin implementation, not an update to upstream PR #6306.
  Unit tests alone cannot demonstrate that the bundled mpv runtime
  invokes every hook exactly as expected.

## Sources

- https://docs.iina.io/interfaces/IINA.API.MPV.html
- https://docs.iina.io/pages/creating-plugins.html
- https://mpv.io/manual/stable/#properties
- https://github.com/iina/iina/pull/6306
