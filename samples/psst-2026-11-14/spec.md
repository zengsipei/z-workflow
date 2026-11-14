# Composer popovers follow their trigger

## Problem Statement

In the workbench composer, the emoji, sticker and poll popovers open pinned to the composer's left edge, about 880 px away from the button that opened them. On a 1280 px viewport the Emoji button sits at x=1167 and the popover opens at x=288; the Poll button sits at x=1119 and its popover also opens at x=288. A user clicking a button gets a panel on the other side of the composer, so the popover reads as unrelated to the click.

## Solution

Each composer popover opens anchored to the button that opened it: its left edge tracks the trigger's left edge, clamped so the panel stays inside the composer. When the panel is wider than the space to the right of the trigger, it shifts left and stays fully visible. The message context-menu picker keeps its current inline placement, which is already anchored to the menu.

## User Stories

1. As a room member, I want the emoji picker to open under the Emoji button, so that the panel and the button read as one control.
2. As a room member, I want the sticker and custom tabs to open in the same place as the emoji tab, so that switching tabs does not move the panel.
3. As a room member, I want the poll composer to open under the Poll button, so that I do not have to hunt for it.
4. As a room member on a narrow window, I want the panel clamped inside the composer, so that it never hangs off the edge.

## Implementation Decisions

- Placement is computed from two rectangles only: the trigger's left edge and the composer's left edge, with the panel width and the composer width as clamps. No measuring of unrelated ancestors.
- The computation is a pure function so it can be tested without a layout engine; the composer supplies the rectangles it already has access to when a popover opens.
- The popover keeps its existing class and vertical placement (above the composer). Only the horizontal anchor changes, as an inline offset with the current 8 px as the fallback.
- The message context-menu picker keeps `position: static` and passes no anchor.
- `.scratch/` becomes ignored by the repo, because the workflow keeps draft specs and tickets there.

## Testing Decisions

- One seam: the pure placement function, called by the composer and by the test.
- The regression test asserts the rendered popover markup carries the anchor the trigger produced, and that a trigger near the composer's right edge is clamped instead of overflowing. Layout engine stays out of the test.
- Behaviour check on the running app: click Emoji, then Poll, and confirm each panel's left edge tracks its button.

## Out of Scope

- The autocomplete popover, the reaction flyout and the emoji picker inside the message context menu.
- Vertical placement, panel size, tabs and content.

## Further Notes

Tickets: 01-anchor-composer-popovers, 02-ignore-scratch-drafts.

The defect covers three entry points the user named (emoji, stickers, poll) but only two trigger buttons: stickers and custom emoji are tabs of the emoji popover, so they follow the Emoji button. Evidence from the reproduction run lives in the project verification skill's artifacts under `popover-anchor-run-1`.
