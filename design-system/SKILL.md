---
name: control-cuentas-design
description: Use this skill to generate well-branded interfaces and assets for control·cuentas, a personal-finance dashboard (web + mobile, Spanish, modern minimal fintech), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `readme.md` — full design guide: content fundamentals, visual foundations, iconography, component index.
- `styles.css` — single CSS entry point (link this); `@import`s `fonts.css` + `tokens/*`.
- `tokens/` — colors, typography, spacing/radii/shadows/motion, base resets.
- `components/` — React primitives (forms, feedback, finance, layout). Each has `.jsx`, `.d.ts`, `.prompt.md`, and a live `*.card.html`.
- `ui_kits/web/` + `ui_kits/mobile/` — full product recreations to copy from.
- `assets/` — logo mark (light + dark).
- `cards/` — foundation specimen cards.

## Essentials to honor
- **Spanish (es-ES)**, money formatted `12.480,55 €`, true minus `−` for negatives.
- **Green = money/positive**, red = gasto/negative, amber = pending, blue = info. Keep finance signals semantic.
- **Numbers in JetBrains Mono** with tabular figures; display in Schibsted Grotesk; UI/body in Hanken Grotesk.
- **No emoji.** Icons = Lucide line icons.
- Light-first, white cards, hairline borders, soft shadows, restrained motion (no bounce).
