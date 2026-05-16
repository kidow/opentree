# opentree — Design

## Brand

opentree is an open-source, local-first link-in-bio builder. The name
joins **open** + **tree** — a growing, branching structure of links.
The brand identity leans on that: organic, calm, trustworthy. Green is
the brand color — it reads as "tree", as "go / live", and as open-source
healthiness.

## Color palette

### Brand green

| Token                | Hex       | Use                                    |
| -------------------- | --------- | -------------------------------------- |
| `--brand-green`      | `#15703f` | Primary brand green (deep / dark)      |
| `--brand-green-dark` | `#0e5530` | Hover / pressed state                  |
| `--brand-green-soft` | `#e6f4ec` | Tinted background (badges, highlights) |
| `--brand-green-fg`   | `#ffffff` | Foreground on brand green              |

### Neutral UI tokens (existing)

| Token          | Hex       | Use                          |
| -------------- | --------- | ---------------------------- |
| `--bg`         | `#f5f5f5` | App background               |
| `--surface`    | `#ffffff` | Panels, cards                |
| `--border`     | `#e5e5e5` | Hairlines, dividers          |
| `--text`       | `#111111` | Primary text                 |
| `--text-muted` | `#888888` | Secondary text               |
| `--accent`     | `#111111` | Neutral accent (save, tabs)  |

## Usage

- **Brand green** is reserved for moments that represent the product
  moving forward: the "Update Now" action in the status bar, future
  primary brand CTAs, and "live / published" indicators.
- The neutral `--accent` (near-black) stays the default action color
  for in-editor controls (Save, active tab) so the editing surface
  stays calm and content-first.
- Do not mix brand green and `--accent` on the same control.

## Future

`--accent` may later adopt `--brand-green` for a fuller brand
expression. Kept neutral for now to scope visual change.
