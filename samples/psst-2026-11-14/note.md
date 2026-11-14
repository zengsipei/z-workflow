# Agent Note: Composer popovers anchor to their trigger

Status: implemented

## Problem

The emoji, sticker and poll panels opened pinned to the composer's left edge rather than to the button that opened them. On a 1280 px viewport the Emoji button sits at x=1167 and its panel opened at x=288, so a click on the right end of the composer produced a panel on the far left. The panel read as unrelated to the click, and on a narrow window the same rule pushed it toward the edge.

## Decision

Each composer popover's left edge follows the trigger button's left edge, clamped to stay inside the composer. The geometry enters the component as a pure function of four numbers: trigger left, composer left, panel width, composer width. Missing geometry keeps the styles' 8 px fallback. The message context-menu picker keeps its inline placement and passes no anchor, because it already sits inside its menu.

## Alternatives considered

- CSS-only change from left to right alignment. Smallest diff, but it still ignores which button was clicked, so the panel would drift again the moment the toolbar moves or a second row appears.
- Portal the panel to the viewport and position it against the trigger. Correct for any ancestor, but it needs scroll and resize observers and a stacking-context story; the composer already is the positioning parent, so the extra machinery buys nothing here.
- Leave the defect: rejected, the panel is the primary way to reach stickers and polls.

## Consequences

Placement is now one testable function instead of a stylesheet constant, so the next popover added to the composer gets the behaviour for free. The cost is that placement depends on measuring at click time, so a popover opened while the composer is animating or hidden would fall back to the left edge. No baseline showed the panel ever opening mid-animation.

## Revisit signal

- Revisit: a popover rendered from a portal, or a report of a composer popover opening at the left edge after a resize or a window drag.
