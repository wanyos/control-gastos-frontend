# Resumen — feature 3 `tailwind-setup`

Fecha de cierre: 2026-07-10
Intención original: `feature_list.json` → feature `tailwind-setup`, bloque `intent`
Spec (si SDD): no aplica (feature de flujo simple, sin spec)

## Qué hace ahora la app que antes no

Tailwind CSS (v4) está instalado y funcionando en todo el proyecto. A partir
de ahora, cualquier pantalla o componente se puede estilizar escribiendo
clases de utilidad directamente en el HTML del componente (p. ej.
`class="bg-gray-50 min-h-screen"`), sin tener que montar nada de tooling de
CSS. Antes no había ningún sistema de estilos configurado.

## Por dónde se usa (puntos de entrada)

- **Al maquetar:** escribe clases de Tailwind en el `<template>` de cualquier
  componente `.vue`. Vite las compila automáticamente (solo las que se usan).
- **Ejemplo vivo:** el contenedor raíz de la app (`src/App.vue`) ya lleva
  clases de utilidad; con `pnpm dev` se ve el fondo gris claro a pantalla
  completa con la tipografía suavizada.
- **Nada más que hacer:** las futuras features de UI no necesitan configurar
  nada; Tailwind ya está cargado globalmente desde el arranque de la app.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Plugin de Tailwind registrado en Vite | `vite.config.ts:6` (import) y `vite.config.ts:13` (activación) |
| Hoja de estilos global (única entrada de Tailwind) | `src/assets/main.css:4` |
| Carga de la CSS al arrancar la app | `src/main.ts:1` |
| Clases de utilidad de ejemplo (shell de la app) | `src/App.vue:2` |
| Tests del shell con Tailwind | `src/__tests__/App.spec.ts:19-26` (y 13-17, 28-33) |
| Dependencias añadidas | `package.json:27` y `package.json:46` |
| Versiones exactas documentadas | `docs/stack.md:48-55` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ **"Cuando arranco con pnpm dev, una clase de utilidad de Tailwind aplicada
  en un componente se ve reflejada"** → se cumple. Las clases están en el shell
  (`src/App.vue:2`); un test verifica su presencia en el componente montado
  (`src/__tests__/App.spec.ts:19-26`). Como el entorno de tests (jsdom) no
  "pinta" CSS, la parte visual se verificó de dos formas: el CSS compilado del
  build contiene esas clases (`.bg-gray-50`, `.min-h-screen`, etc. — comprobado
  por el reviewer tras `pnpm build`) y el smoke con `pnpm dev` sirvió el CSS
  compilado de Tailwind (comprobado por el implementer, servidor parado después).
- ✅ **"La configuración sigue la forma recomendada de Tailwind v4 para Vite y
  respeta la política de @apply de docs/conventions.md"** → se cumple. Es la
  forma oficial de v4: plugin `@tailwindcss/vite` (`vite.config.ts:13`) +
  `@import 'tailwindcss'` en la CSS global (`src/assets/main.css:4`), sin
  `tailwind.config.js` ni PostCSS (v4 no los necesita). No hay ningún `@apply`
  en el código; la excepción permitida queda documentada en la cabecera de
  `src/assets/main.css:1-3` por si algún día hace falta.
- ✅ **"pnpm build y ./init.sh siguen en verde tras añadir Tailwind"** → se
  cumple; el reviewer los volvió a ejecutar en la revisión: `./init.sh`
  terminó verde (type-check OK, 27/27 tests) y `pnpm build` compiló sin
  errores. Evidencia en `progress/reviews/tailwind-setup.md`.

## Decisiones que se tomaron por ti

Lo que el `intent` marcaba como delegado en el agente:

- (delegado) **Versión exacta:** `tailwindcss` **4.3.2** y `@tailwindcss/vite`
  **4.3.2** (última estable en la fecha), fijadas con rango `^4.3.2` en
  `package.json` y anotadas en `docs/stack.md:48-55`.
- (delegado) **Estructura de la CSS global:** una sola hoja en
  `src/assets/main.css` con el `@import` de Tailwind, cargada como primera
  import de `src/main.ts` (estilos listos antes de montar la app). Ese mismo
  archivo será el destino del `@reference` si algún día se usa la excepción
  de `@apply` en un componente.

## Qué NO se tocó / quedó fuera

- No se maquetó ninguna pantalla ni componente de negocio: `App.vue` solo
  lleva clases de "cascarón" (fondo, altura mínima, tipografía base), tal
  como pedía el `que_no_quiero`.
- No se añadió ningún UI kit ni librería de componentes: solo Tailwind y su
  plugin de Vite (verificado en el diff de `package.json`).
- Dark mode, tokens de diseño propios (`@theme`) y criterios responsive:
  pendientes de definir cuando haya UI real (ya anotado en
  `docs/conventions.md`).

## Notas para el futuro (opcional)

- Aviso de peer-deps **anterior a esta feature**: `eslint-plugin-oxlint@1.72.0`
  espera `oxlint ~1.72.0` y está instalado `1.73.0`. No bloquea nada; alinear
  versiones en una tarea de mantenimiento.
- Cuando exista la primera vista real, valorar definir tokens de diseño con
  `@theme` en `src/assets/main.css` (sugerencia del implementer, fuera de
  scope aquí).
