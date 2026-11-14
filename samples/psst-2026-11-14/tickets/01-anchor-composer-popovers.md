# 01: Anchor composer popovers to their trigger button

**What to build:** the emoji popover and the poll popover open with their left edge at the trigger button's left edge, clamped to stay inside the composer. Opening either popover from the message context menu keeps its current static inline placement.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A pure placement function takes the trigger left, the composer left, the panel width and the composer width, and returns a clamped left offset (8 px fallback when no trigger geometry is available).
- [ ] The emoji popover and the poll popover both use it; the emoji popover's sticker and custom tabs inherit the same anchor.
- [ ] The message context-menu picker renders unchanged (no inline left offset, still `position: static`).
- [ ] A unit test in the composer test suite fails on the old behaviour and passes on the new one, covering the normal case and the clamp case.
- [ ] `pnpm typecheck`, `pnpm -r build` and `pnpm test` pass.
- [ ] A browser run shows the Emoji panel and the Poll panel each opening under its own button at 1280x813.
