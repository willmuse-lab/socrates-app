# Brand exports

Square icon exports made for Stripe's branding settings (square, ≥128px, ≤512KB,
JPG/PNG) — but they suit any favicon-shaped slot: app stores, social profiles,
Google Workspace, an LMS listing.

| File | What it is | Use it when |
|---|---|---|
| `socratesiq-icon-owl-512.png` | The owl mark alone, 512×512, white ground | Anywhere small — favicons, avatars, Stripe's icon slot. Stays readable down to 16px. |
| `socratesiq-icon-lockup-512.png` | Owl + SocratesIQ + "Wisdom in the Age of AI", 512×512, white ground | Only where it renders 128px or larger. The tagline is illegible below that. |

Both are generated from `public/owl.png` and `public/logo.png` (the Design 1 /
Abstract Owl artwork — Design 2, the Geometric Owl, is not used anywhere): trim
the transparent border, scale to fit with an even margin, centre on white. White
rather than transparent because these sit on light AND dark chrome, and a navy
mark on a dark surface disappears.

Regenerate after any logo change with the snippet in the Aug 29 handoff block.

## Colours

| Role | Hex |
|---|---|
| Primary — deep navy ink | `#17213B` |
| Accent — slate blue | `#3E5C86` |
| Deepest ink (primary buttons) | `#0E1626` |
| Warm paper (page background) | `#F4EFE4` |
| Logo teal (the "IQ" and the mark's right side) | `#007880` |

The first two are the brand pair; the rest are supporting. They are the live
values from `src/index.css`, not approximations.
