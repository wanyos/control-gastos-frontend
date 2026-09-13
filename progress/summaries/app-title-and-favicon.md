# Resumen — feature 11 `app-title-and-favicon`

Fecha de cierre: 2026-09-13
Intención original: `feature_list.json` → feature `app-title-and-favicon`, bloque `intent`
Spec (si SDD): no aplica

## Qué hace ahora la app que antes no

La pestaña del navegador dice "Control Accounts" y muestra el logo del proyecto
(el cuadrado verde con la línea de tendencia del design system) en lugar del
icono de Vue. También sale al guardar la app en la pantalla de inicio de un iPhone.

## Por dónde se usa (puntos de entrada)

- La pestaña del navegador al abrir la app (en desarrollo y en el build de producción).
- `/favicon.svg`, `/favicon-32x32.png`, `/apple-touch-icon.png`: archivos servidos desde `public/`.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Enlaces de los iconos | `index.html:5` |
| Título de la pestaña | `index.html:9` |
| Icono principal (SVG, copia del logo con etiqueta en inglés) | `public/favicon.svg:1` |
| Respaldo PNG 32 px e icono iOS 180 px | `public/favicon-32x32.png`, `public/apple-touch-icon.png` |
| Test: título exacto y `lang="en"` | `src/__tests__/index-html.spec.ts:26` |
| Test: enlaces SVG, PNG y apple-touch-icon | `src/__tests__/index-html.spec.ts:31` |
| Test: todo lo enlazado existe; fuera `favicon.ico` | `src/__tests__/index-html.spec.ts:44` |
| Test: el SVG es el logo del design system | `src/__tests__/index-html.spec.ts:59` |

## Cumplimiento de la intención

- ✅ "La pestaña del navegador dice exactamente 'Control Accounts'" → se cumple; `src/__tests__/index-html.spec.ts:26`, y comprobado en navegador real (chromium, firefox, webkit).
- ✅ "El icono es el del proyecto, coherente con el design system y la app en oscuro, no el de Vue" → se cumple; `src/__tests__/index-html.spec.ts:59` (idéntico a `design-system/assets/logo-mark.svg`) y `:44` (`favicon.ico` borrado y no enlazado).
- ✅ "Se distingue bien con la barra de pestañas en claro y en oscuro" → se cumple; evidencia visual en `progress/implementation/app-title-and-favicon/tabs-1x.png` y `zoom-16px-x8.png`.
- ✅ "Sale también en el build de producción" → se cumple; `pnpm build` deja los tres archivos en `dist/` y `dist/index.html` los enlaza; el e2e de humo contra el build pasa en los tres navegadores.

## Decisiones que se tomaron por ti

- (delegado) Variante verde (`logo-mark.svg`) y no la oscura: la oscura se funde con la barra de pestañas oscura; la verde se ve en ambos temas sin trucos.
- (delegado) Formatos: SVG principal, PNG de 32 px de respaldo y apple-touch-icon de 180 px (opaco, porque iOS redondea las esquinas). Sin `.ico`, que exigiría una herramienta nueva. Los PNG se generaron con Playwright, ya instalado.
- (añadido) La etiqueta accesible del SVG pasa de "control·cuentas" a "Control Accounts" (textos en inglés).

## Qué NO se tocó / quedó fuera

- Ni sidebar, ni textos, ni colores, ni componentes, ni `e2e/`, ni `package.json`.
- `design-system/` intacto.
- Sin `site.webmanifest` ni `theme-color`.

## Notas para el futuro (opcional)

- Los logos originales de `design-system/assets/` siguen con la etiqueta en español; convendría pasarlos a inglés en origen.
- Un `site.webmanifest` sería el siguiente paso si se quiere instalar la app como PWA.
