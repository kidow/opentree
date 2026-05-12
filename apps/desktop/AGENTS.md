# opentree desktop agent guide

Use this file when working on `apps/desktop`.

## Central Panel Layout

- Keep the main tab header at `52px` height.
- Keep the header flat: no extra vertical padding, no nested header bars, no shadow.
- Keep the tab body flush to the header. Avoid extra outer padding on the main content container.
- Prefer line tabs for section switching inside a tab panel instead of stacked section labels.
- Prefer single borders and flat separators over nested rounded containers.
- If a list or card stack appears visually doubled, remove the outer radius first, then remove duplicated borders.
- Apply the same flat layout rules across `Links`, `Design`, `Publish`, `Stats`, and `Settings`.
- Preserve shadcn-style spacing and typography, but do not reintroduce extra shell padding around the central panel.
