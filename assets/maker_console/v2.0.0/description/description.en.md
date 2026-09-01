**Two Windows 11 gaming settings, one key press away.**

You are mid-match and the Xbox button on your controller pulls Game Bar over the game. Or you want Game Mode on for a session and off when you are done. Both settings live several clicks deep in the Settings app — exactly where you do not want to be while you are playing.

Gaming Toggles for PC puts both of them on your Stream Deck.

## Two actions

**Toggle Game Mode** — turns Windows 11 Game Mode on or off.

**Controller opens Game Bar** — decides whether the Xbox button on your controller is allowed to open Game Bar.

Drag them onto any key, in any profile. Press once. That is the whole workflow.

## The key never lies

Most toggles write a value and assume it worked. This one reads the value back after writing it. If Windows did not keep the change, the key returns to the real state instead of showing you a setting you do not actually have.

It also re-checks both settings every 2.5 seconds. Change either one from the Settings app and the key updates on its own — no reload, no desync. In the other direction, pressing the key broadcasts a system-wide settings change, so an open Settings page reflects it immediately.

## Built to be read at a glance

The key art is flat and high contrast, drawn to stay legible on a 72-pixel key. On and off differ in shape and brightness, not just colour, so the state is clear across the room and readable if you are colour blind.

## Requirements

- Windows 11
- Stream Deck 7.1 or later

## What it does not do

**No administrator rights.** It writes two values inside your own user's registry hive, `HKCU\Software\Microsoft\GameBar`, and touches nothing else on your system.

**No network access.** The plugin makes zero outbound connections. Nothing is collected, and nothing is sent anywhere.

**No bloat.** One runtime dependency: Elgato's own Stream Deck SDK.

## Open source

Released under the MIT licence. The full source is on GitHub, every release is built by GitHub Actions from a tagged commit, and each installer ships with a published SHA-256 checksum you can verify yourself.

Available in English and Spanish, following your Stream Deck language.

Bug reports, translations and pull requests are welcome.

---

Microsoft, Windows and Xbox are trademarks of the Microsoft group of companies. This is an independent project, not affiliated with, sponsored by or endorsed by Microsoft, Elgato or Corsair.
