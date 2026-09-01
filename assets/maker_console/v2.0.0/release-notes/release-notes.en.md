**New key art, drawn to be read at key size.**

Both actions were redrawn as flat vector icons. On and off now differ in shape and brightness, not only in colour, so the state is clear at a glance and stays readable if you are colour blind. In the previous art the two states were nearly identical in greyscale, and Game Mode was inverted — off rendered brighter than on.

**Live two-way sync.**

Press the key and the Settings app updates immediately. Change either setting in Windows and the key catches up within 2.5 seconds. The plugin writes the value, reads it straight back, and shows the state you actually have instead of assuming the write worked.

**Renamed, with a new plugin ID.**

If you installed an earlier build from GitHub Releases, this version installs **alongside** it rather than upgrading it, because Stream Deck identifies plugins by ID. Remove the old one, then drag the two actions onto your profile again.

**Also in this release**

- Every image now ships at the size the Stream Deck SDK expects.
- English and Spanish, following your Stream Deck language.
- Still no administrator rights, no network access, and one runtime dependency.
- Built by GitHub Actions from a tagged commit, with a published SHA-256 checksum.
