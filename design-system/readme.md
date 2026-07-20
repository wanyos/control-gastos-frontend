# control·cuentas — Design System

A design system for **control·cuentas**, a personal-finance dashboard for individuals. The product centers on one job: give a person a calm, confident, at-a-glance picture of *all* their money — bank accounts, expenses, income, expense categories, investments and savings — through clear charts and tight, trustworthy numbers.

- **Surfaces:** Web app (dashboard) · Mobile app
- **Audience:** Individuals managing their own finances
- **Language:** Spanish (es-ES) — including number/currency formatting (`1.234,56 €`)
- **Personality:** Modern, minimal fintech · serious and data-dense · quietly trustworthy

> **Sources:** None provided — this system was designed from scratch to the brief above. There is no upstream codebase, Figma, or brand guide. If/when those exist, reconcile this system against them.

---

## How this project is wired

The compiler reads files by content + sibling relationships, not folder names. The one fixed entry point is **`styles.css`** at the root — a list of `@import`s only. Consumers link that single file.

```
styles.css            → @imports everything below
fonts.css             → webfonts (@import from Google Fonts)
tokens/
  colors.css          → brand green, neutrals, finance signals, chart palette + semantic aliases
  typography.css      → families, scale, weights, tracking
  spacing.css         → 4px grid, radii, shadows, z-index, motion, layout vars
  base.css            → resets + small utility layer (.cc-num, .cc-overline, .cc-positive…)
assets/               → logo mark (light + dark)
cards/                → foundation specimen cards (Design System tab)
components/           → React primitives (forms, feedback, finance, layout)
ui_kits/              → full-screen product recreations (web dashboard, mobile app)
SKILL.md              → Agent-Skills entry point
```

---

## CONTENT FUNDAMENTALS

**Language & formatting.** All UI copy is **Spanish (es-ES)**. Money is formatted the Spanish way: thousands with `.`, decimals with `,`, currency symbol after a space — `12.480,55 €`. Negative amounts use a true minus `−`, positive amounts a leading `+` only where sign matters (deltas, transactions).

**Voice.** Plain, calm, second-person **tú** ("tu dinero", "tus movimientos", "ahorra sin pensar"). Never corporate or jargon-heavy. We explain money simply and never lecture. Reassuring, not hype: the app is a quiet ally, not a coach shouting at you.

**Tone examples**
- Empty state: *"Aún no hay movimientos este mes. En cuanto haya actividad, aparecerá aquí."*
- Positive nudge: *"Vas bien: has gastado un 12% menos que el mes pasado."*
- Section labels (overlines): `SALDO TOTAL`, `GASTOS DEL MES`, `PRÓXIMOS PAGOS` — short, uppercase, no articles.
- CTAs: imperative and short — *Nuevo movimiento, Vincular cuenta, Crear meta, Ver detalle.*

**Casing.** Sentence case for titles and body (*"Resumen del mes"*, not Title Case). UPPERCASE only for micro eyebrow/overline labels and is always tracked out (`letter-spacing: 0.08em`). Never ALL-CAPS a sentence.

**Numbers are the content.** This is a data product — the figure is usually the hero, the words are scaffolding. Lead with the number, support with a short label. Keep secondary text to one line.

**Emoji:** none. The brand uses Lucide line icons, never emoji. Unicode is used only for finance glyphs already in numeric context: `€`, `−`, `+`, `▲`, `▼`, `····` (masked card digits), `·` (separator, also the brand dot).

---

## VISUAL FOUNDATIONS

**Overall feel.** Light-first, white cards floating on a soft near-white app background (`--surface-app #F7F9FB`). Dense but breathable — generous internal padding, hairline borders, restrained shadows. The signature dark moment is a deep-green gradient "saldo total" hero (see the *Marca en uso* card). Nothing is loud; confidence comes from precision.

**Color.**
- **Primary** is a confident emerald green (`--brand #0A8F5F`) with a brighter mint accent (`--green-500 #12B886`). Green = money, growth, "you're in control". Used for primary buttons, active nav, positive figures, the logo, and the hero gradient.
- **Neutrals** are a cool slate ink scale (`--neutral-*`) for text, borders and surfaces — never warm/beige.
- **Finance signals are semantic and consistent everywhere:** ingreso/positive = green, gasto/negative = red (`--negative #E5484D`), aviso/pending = amber, info/programado = blue.
- **Charts** use an 8-hue categorical palette (`--chart-1…8`) that starts at brand green and walks through mint, blue, indigo, amber, coral, purple, teal. Each spending category keeps the same hue across the whole app.

**Type.** Three families: **Schibsted Grotesk** (display — page titles, section headings; tight `-0.02em` tracking, weight 700–800), **Hanken Grotesk** (UI & body — default 14px, very legible), **JetBrains Mono** (all money & metrics — `font-variant-numeric: tabular-nums lining-nums` so columns of figures align perfectly). The mono-for-numbers rule is core to the brand: any balance, amount, percentage or metric is set in JetBrains Mono.

**Spacing & layout.** Strict 4px grid (`--space-*`). Web app is a fixed 248px sidebar + 60px top bar + fluid content (max 1320px). Dense card grids (2–4 columns of KPI tiles). Mobile is a single 390-ish px column with a bottom tab bar.

**Backgrounds.** Mostly flat: app background `#F7F9FB`, cards pure white. **No** decorative photography, no noise, no busy patterns. The *only* gradient is the brand-green hero balance card (a 160° `#0E7C55 → #075C3F`). Donut/line charts add the color. Keep it clean.

**Corners & cards.** Cards: `--radius-lg` (14px), 1px `--border-subtle` hairline, `--shadow-sm` (very soft, low-contrast). Buttons/inputs: `--radius-md` (10px). Pills/badges/avatars: full radius. Elevation ramp is gentle — `xs → xl` barely increase opacity; we lean on borders more than shadows (fintech restraint). No hard drop shadows, no glow except the brand-green button shadow.

**Borders.** Hairlines everywhere (`--border-subtle #E3E8ED`). Inputs use `--border-default`; focus swaps to brand green plus a 3px translucent green ring (`--ring-brand`). Dividers between list rows are the lightest neutral or simply row-hover background changes (no rule line).

**Motion.** Quick and restrained — `--dur-fast 120ms` to `--dur-slow 280ms`, eased with `cubic-bezier(0.22,1,0.36,1)` (gentle decelerate). **No bounce, no spring.** Bars and rings animate width/stroke on load; numbers can count up. Honor `prefers-reduced-motion` (base.css already kills animations there).

**Hover states.** Buttons darken one step (primary → `--brand-hover`); secondary/ghost get `--surface-hover` fill; cards marked `interactive` lift 1px and gain `--shadow-md`; list rows get a `--surface-hover` background. Links underline on hover.

**Press states.** Buttons scale to `0.97` (subtle, fast). No color flash beyond the hover darken.

**Transparency & blur.** Used sparingly — overlay scrims (`--surface-overlay`, ~48% ink) behind modals/sheets; translucent white pills (`rgba(255,255,255,.14)`) on the green hero. No frosted-glass everywhere.

**Imagery vibe.** There is essentially no photography. If a marketing context ever needs it, keep it cool-toned, bright, and clean — but the product itself is charts + numbers, not pictures.

---

## ICONOGRAPHY

- **System:** [Lucide](https://lucide.dev) — consistent 1.5–2px stroke, rounded line caps, 24px grid. It matches the brand's minimal, precise feel.
- **Why Lucide (substitution flag):** no icon set was provided, so Lucide is the chosen substitute. It's MIT-licensed and CDN-available. If the brand later adopts a custom or different set, swap the CDN link and update components that take icon nodes. **→ Flagged for your confirmation.**
- **How to use:** load `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`, write `<i data-lucide="wallet"></i>`, then call `lucide.createIcons()`. Components that accept icons (`Button.iconLeft`, `StatCard.icon`, `TransactionRow.icon`, `CategoryBar.icon`, `IconButton` children) take any node — pass a Lucide `<i>`.
- **Common glyphs:** `wallet`, `trending-up`, `trending-down`, `banknote`, `piggy-bank`, `credit-card`, `shopping-cart`, `home`, `car`, `utensils`, `repeat` (suscripciones), `arrow-up-right`, `arrow-down-left`, `plus`, `settings`, `sliders-horizontal`, `bell`, `search`.
- **Color:** icons inherit `currentColor` — muted (`--text-muted`) in chrome, brand green when active, category color inside category contexts.
- **Sizing:** 16px inline in buttons/rows, 18–20px in nav, 24px for feature/empty states. Stroke stays Lucide's default.
- **Emoji / unicode:** no emoji, ever. Unicode limited to finance glyphs in numeric context (`€ − + ▲ ▼ ····`) and the brand separator dot `·`.

---

## Components (`components/`)

`window.ControlCuentasDesignSystem_7df875.<Name>` after loading `_ds_bundle.js`.

| Group | Components |
|---|---|
| `forms/` | **Button**, **IconButton**, **Input**, **Select**, **Switch**, **Checkbox** |
| `feedback/` | **Badge**, **Tag**, **ProgressBar** |
| `finance/` | **StatCard**, **AccountCard**, **TransactionRow**, **CategoryBar** |
| `layout/` | **Card**, **Avatar** |

Each directory has a `<Name>.jsx`, `<Name>.d.ts` (props contract), `<Name>.prompt.md` (usage), and a `*.card.html` showing live states in the Design System tab. The **finance** group is the brand's signature — those four primitives compose into the entire dashboard.

## UI kits (`ui_kits/`)

- **`ui_kits/web/`** — desktop dashboard (sidebar + KPI grid + charts + movimientos). See `index.html`.
- **`ui_kits/mobile/`** — mobile app (saldo hero, cuentas, movimientos, bottom tab bar). See `index.html`.

## Foundation cards (`cards/`)

Specimen cards for the Design System tab — Colors (brand, neutral, finance signals, charts), Type (display, UI, mono, scale), Spacing (scale, radii, shadows), Brand (logo, marca en uso).

---

## Known caveats / flags

1. **Fonts load from Google Fonts CDN** (`fonts.css`), so the compiler reports 0 local `@font-face`. They render fine in any online browser. For fully offline shipping, download the woff2 files into `assets/fonts/` and replace the `@import` with local `@font-face`. *Schibsted Grotesk + Hanken Grotesk + JetBrains Mono are the intended faces, not substitutes.*
2. **Lucide** is a substitution for an unspecified icon set — confirm or replace.
3. Built from a brief with no source material — please review color, type and voice against your real brand intent.
