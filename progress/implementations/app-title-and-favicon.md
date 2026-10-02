# Implementación — feature 11 `app-title-and-favicon`

- **Tipo:** no-SDD (contrato: `intent` + 8 criterios de `acceptance`).
- **Estado en `feature_list.json`:** `in_progress` (sin tocar; lo cierra el flujo tras el reviewer).
- **Fecha:** 2026-09-13

## Qué se ha hecho

1. `index.html`: `<title>Control Accounts</title>` exacto; `lang="en"` se conserva.
2. Favicon nuevo basado en el logo del design system, copiado a `public/` (no se ha tocado `design-system/`).
3. Respaldo PNG de 32 px y `apple-touch-icon` de 180 px, rasterizados con Playwright (ya instalado); **sin dependencias nuevas**.
4. Eliminado `public/favicon.ico` (el de Vue del scaffold): ya no se enlaza.
5. Test unitario nuevo `src/__tests__/index-html.spec.ts` que fija título, enlaces e iconos.

## Variante del logo elegida: `logo-mark.svg` (fondo verde `#0A8F5F`, línea blanca)

Se ha renderizado cada variante sobre los colores de la barra de pestañas de Chrome
(tira y pestaña activa, en tema claro y oscuro) a 16 y 32 px:

| Fondo de la pestaña | verde `#0A8F5F` (contraste del contorno) | casi negro `#0B1116` |
|---|---|---|
| claro, tira `#DEE1E6` | 3.14:1 | 14.48:1 |
| claro, pestaña `#FFFFFF` | 4.11:1 | 18.99:1 |
| oscuro, tira `#202124` | 3.92:1 | **1.18:1** |
| oscuro, pestaña `#35363A` | 2.93:1 | **1.57:1** |

- La variante oscura desaparece en pestañas oscuras (1.18:1 y 1.57:1: el cuadrado se funde
  con la barra y solo queda la línea verde flotando, que a 16 px es un par de píxeles).
- La verde conserva su silueta en los cuatro fondos (≈3:1 o más, el umbral de WCAG para
  elementos gráficos) y el glifo blanco sobre verde es 4.11:1 siempre, porque va dentro del
  cuadrado y no depende de la barra.
- Se descartó `prefers-color-scheme` dentro del SVG: el tema de la barra de pestañas no siempre
  coincide con el esquema del sistema que ve el SVG (y Safari/Firefox lo aplican de forma
  desigual). Un icono que funciona en ambos fondos sin lógica es más robusto. Además, el verde
  es el color de marca de la app oscura (`#0A8F5F`/`#34C68C`), así que sigue siendo coherente.

Único cambio respecto al original: `aria-label="control·cuentas"` → `aria-label="Control Accounts"`
(el test compara el resto del SVG con `design-system/assets/logo-mark.svg` byte a byte).

### Evidencia (en `progress/implementation/app-title-and-favicon/`)

- `tabs-1x.png` — ambas variantes a 16 y 32 px reales (DPR 1) sobre los cuatro fondos, junto al texto de la pestaña.
- `zoom-16px-x8.png` — la rasterización de 16 px ampliada x8 sin suavizado, para juzgar píxel a píxel.
- `render-script.cjs.txt` — el script de Playwright que genera las dos imágenes, los PNG de `public/` y la tabla de contraste (con extensión `.txt` para que no lo recojan lint/type-check).

## Formatos

| Archivo | Enlace en `index.html` | Por qué |
|---|---|---|
| `public/favicon.svg` | `rel="icon" type="image/svg+xml"` | Principal: nítido a cualquier tamaño/DPR. |
| `public/favicon-32x32.png` | `rel="icon" type="image/png" sizes="32x32"` | Respaldo para navegadores sin favicon SVG (Safari antiguos). Con `sizes="32x32"` Chromium/Firefox prefieren el SVG. |
| `public/apple-touch-icon.png` (180×180) | `rel="apple-touch-icon"` | iOS no usa SVG. Se rasteriza **sin** el `rx` (opaco, a sangre) porque iOS aplica su propia máscara redondeada; con esquinas transparentes quedarían bordes negros. |

No se añade `.ico`: todos los navegadores actuales aceptan PNG como favicon, y generar un `.ico`
exigiría una herramienta que no está en el proyecto.

## Build de producción

`pnpm build` copia `public/` a `dist/`: `dist/favicon.svg`, `dist/favicon-32x32.png`,
`dist/apple-touch-icon.png`, y `dist/index.html` los enlaza con las mismas rutas.
Comprobado sirviendo `dist/` con `vite preview` en el puerto 8123 (el 5173 del humano no se tocó)
y Playwright: título `"Control Accounts"`; los tres enlaces responden 200 con
`image/png` / `image/svg+xml`; `/favicon.ico` da 404 (ya no existe ni se enlaza).
El e2e de humo contra el build (`CI=true E2E_PREVIEW_PORT=8124 pnpm test:e2e --project=chromium`)
pasa sin cambios (sin errores de consola por iconos).

## Archivos

- Modificado: `index.html`
- Creados: `public/favicon.svg`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`,
  `src/__tests__/index-html.spec.ts`, `progress/implementation/app-title-and-favicon/*`
- Eliminado: `public/favicon.ico`
- Harness: `progress/current.md`
- Sin cambios: `design-system/`, `src/assets/styles/`, componentes, textos, colores, `e2e/`, `package.json`.

## Tests (criterio → test)

- Título exacto + `lang="en"` → `index.html › titles the tab exactly "Control Accounts" and keeps lang="en"`
- SVG + PNG + apple-touch-icon enlazados → `index.html › links an SVG favicon, a PNG fallback and an apple-touch-icon`
- Todo lo enlazado existe en `public/`; `favicon.ico` ni se enlaza ni existe → `index.html › only links icons that exist in public/...`
- Basado en el logo del design system → `public/favicon.svg › is the design system logo mark (green variant)...` y `› carries the English product name...`
- Legibilidad claro/oscuro y build → evidencia manual arriba (imágenes + comprobación de `dist/`).
- No había ningún test previo que comprobara el título de `index.html` (búsqueda en `src/` y `e2e/`).

## Verificación (última ejecución)

- `pnpm type-check` → OK
- `pnpm lint` → OK (oxlint + eslint sin errores)
- `pnpm test:unit` → 18 archivos, 254 tests OK
- `pnpm build` → OK
- `./init.sh` → verde:
  ```
  [OK]    feature_list.json válido (11 features)
  [OK]    Type check OK (tsc sin errores)
   Test Files  18 passed (18)
        Tests  254 passed (254)
  [OK]    Todos los tests pasan
  [OK]    E2E smoke verde (chromium)
  [OK]    Entorno listo. Puedes empezar a trabajar.
  ```

## Sugerencias fuera de scope (no aplicadas)

- `design-system/assets/logo-mark*.svg` siguen con `aria-label="control·cuentas"`; si el design system se actualiza, convendría pasarlo a inglés en origen.
- Un `site.webmanifest` (PWA / `theme-color`) sería el siguiente paso natural, pero no lo pide la feature.
