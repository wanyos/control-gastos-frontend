# Review — feature 11 `app-title-and-favicon`

**Veredicto:** APPROVED

Feature no-SDD: contrato = `intent` + 8 criterios de `acceptance` (`feature_list.json`, feature 11).

## Trazabilidad requirements ↔ tests (solo SDD)

No aplica (no es SDD).

## Tasks completas (solo SDD)

No aplica.

## Criterios de aceptación (siempre)

- [x] `<title>Control Accounts</title>` exacto y `lang="en"` → `index.html:2,9`; test `src/__tests__/index-html.spec.ts:26`. Confirmado en navegador real (`page.title()` = "Control Accounts" en chromium/firefox/webkit, dev y preview).
- [x] Favicon de Vue retirado; icono basado en el design system sin editar `design-system/` → `public/favicon.ico` borrado y no enlazado (test `:44`); `public/favicon.svg` es `design-system/assets/logo-mark.svg` idéntico salvo `aria-label="Control Accounts"` (tests `:59`, `:63`). `git status design-system/` limpio.
- [x] Enlaces SVG + PNG 32 px + apple-touch-icon, todos existentes en `public/` → `index.html:5-7`; tests `:31` y `:44` (el `:44` recorre todos los `href` enlazados y comprueba que existen en disco).
- [x] Legible en pestañas claras y oscuras → capturas `progress/implementation/app-title-and-favicon/tabs-1x.png` y `zoom-16px-x8.png` revisadas: la variante verde se distingue en los cuatro fondos; la oscura (`#0B1116`) se funde con la barra oscura (`#202124`, 1.18:1). Justificación razonada en el informe (descarta `prefers-color-scheme` en el SVG).
- [x] `dist/` incluye y enlaza los iconos → `pnpm build` ejecutado por el reviewer: `dist/favicon.svg`, `dist/favicon-32x32.png`, `dist/apple-touch-icon.png` presentes y enlazados en `dist/index.html`; sin `dist/favicon.ico`.
- [x] Sin dependencias nuevas, sin cambios de UI, e2e de humo intacto → `package.json`, `pnpm-lock.yaml`, `e2e/`, `src/components`, `src/views`, `src/assets/styles` sin cambios. PNG rasterizados con Playwright ya instalado.
- [x] Test existente de título → no había ninguno (grep en `src/` y `e2e/`).
- [x] type-check, lint, test:unit, build, init.sh → todos verdes.

## Comprobaciones específicas pedidas

- `/favicon.ico` 404: sonda Playwright en dev (`vite` :8151) y build (`vite preview` :8152), en chromium, firefox y webkit. Ningún navegador solicita `/favicon.ico` (los `<link rel="icon">` lo evitan); errores de consola = `[]` en los 6 casos; firefox pide `favicon.svg` y `apple-touch-icon.png` → 200. El e2e de humo en modo build pasa en los tres navegadores (`CI=true E2E_PREVIEW_PORT=8141 pnpm exec playwright test`: 3 passed). Riesgo real: ninguno. Servidores de la sonda parados; el :5173 del humano sigue en pie.
- PNG: `favicon-32x32.png` 32x32 RGBA, 850 B; `apple-touch-icon.png` 180x180 RGB opaco (correcto para la máscara de iOS), 2741 B. Firmas PNG válidas.
- La 11 no tocó archivos de la feature 10: marcas de tiempo de `theme-dark.css`, `main.css`, `theme-dark.spec.ts`, `docs/conventions.md`, `docs/stack.md` (08:xx), `docs/roadmap.md` y `progress/history.md` (17:57) son anteriores al trabajo de la 11 (18:42-18:43). En el harness la 11 solo tocó `progress/current.md`.

## Arquitectura (docs/architecture.md)

- [x] Test co-localizado en `src/__tests__/*.spec.ts`.
- [x] Assets estáticos en `public/`; ningún código de aplicación afectado.

## Convenciones (docs/conventions.md)

- [x] Nombres, test y textos en inglés (incluido `aria-label` del SVG).
- [x] Sin logs sueltos ni TODOs.

## Verificación (docs/verification.md)

- [x] Tests leen los archivos reales (`index.html`, `public/`, `design-system/`), sin mocks.
- [x] Tests verifican valores concretos (título exacto, href/type, existencia, igualdad con el logo).

## CHECKPOINTS.md

- [x] C1 — Arnés completo (`./init.sh` exit 0)
- [x] C2 — Estado coherente (una sola feature `in_progress`)
- [x] C3 — Arquitectura (sin dependencias nuevas)
- [x] C4 — Verificación real
- [ ] C5 — Sesión cerrada bien → pendiente del cierre: entrada de la 11 en `progress/history.md` y paso a `done`. No bloqueante (lo hace el flujo tras aprobar).
- [x] C6 — No afecta al contrato con el backend
- [x] C7 — No aplica (no SDD)
- [x] C8 — Resumen de cierre escrito

## Verificación ejecutada por el reviewer

- `pnpm type-check` → OK
- `pnpm lint` → OK (sin cambios en el working tree tras `--fix`)
- `pnpm test:unit` → 18 archivos, 254 tests OK
- `pnpm build` → OK
- `./init.sh` → exit 0 (incluye e2e de humo chromium)
- e2e de humo contra build en chromium/firefox/webkit → 3 passed

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/app-title-and-favicon.md` → sí

## Notas no bloqueantes

1. El informe dice "aprox. 3:1 o más" para la silueta verde, pero sobre la pestaña oscura `#35363A` es 2.93:1; las capturas muestran que se distingue bien.
2. `design-system/assets/logo-mark*.svg` siguen con `aria-label="control·cuentas"`; el test `:59` ignora la etiqueta, así que cambiarla en origen no rompe nada.
