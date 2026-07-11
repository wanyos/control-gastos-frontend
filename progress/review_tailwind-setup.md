# Review — feature 3 `tailwind-setup`

**Veredicto:** APPROVED

- **Fecha:** 2026-07-10
- **Agente:** reviewer
- **Base de revisión:** feature no SDD → bloque `intent` + `acceptance` de la
  feature 3 en `feature_list.json`, `docs/` y `CHECKPOINTS.md`. Informe del
  implementer: `progress/impl_tailwind-setup.md` (fiel al código real).

## Trazabilidad requirements ↔ tests (solo SDD)

No aplica — la feature no tiene `"sdd": true`; no existe `specs/tailwind-setup/`.

## Tasks completas (solo SDD)

No aplica — feature de flujo simple, sin `tasks.md`.

## Criterios de aceptación (siempre)

- [x] **Tailwind v4 instalado y configurado con `@tailwindcss/vite`** →
  `package.json:27` (`@tailwindcss/vite: ^4.3.2`) y `package.json:46`
  (`tailwindcss: ^4.3.2`), ambas en devDependencies; exactas **4.3.2** en
  `pnpm-lock.yaml:757` y `pnpm-lock.yaml:1976`. Plugin registrado en
  `vite.config.ts:6` (import) y `vite.config.ts:13` (`tailwindcss()` en
  `plugins`). Forma recomendada de v4 para Vite: **no existen**
  `tailwind.config.*` ni `postcss.config.*` (verificado por glob).
- [x] **Hoja de estilos global que importa Tailwind, cargada en `main.ts`** →
  `src/assets/main.css:4` (`@import 'tailwindcss'`, única entrada), importada
  como primera línea de `src/main.ts:1` (antes de vendor y de `mount`).
- [x] **Clase de utilidad en componente de ejemplo renderiza con `pnpm dev`** →
  `src/App.vue:2` (`min-h-screen bg-gray-50 text-gray-900 antialiased` en el
  shell). Presencia verificada por el test
  `applies Tailwind utility classes on the app shell root`
  (`src/__tests__/App.spec.ts:19-26`). Compilación real reproducida en esta
  revisión: tras `pnpm build`, `dist/assets/index-*.css` contiene
  `.min-h-screen`, `.bg-gray-50`, `.text-gray-900`, `.antialiased` y el banner
  `/*! tailwindcss v4.3.2 */`. Smoke dev documentado por el implementer
  (CSS compilado servido en 5173, servidor parado después).
- [x] **`docs/stack.md` con la versión exacta** → `docs/stack.md:48-55`:
  4.3.2 ambas (lockfile), rango `^4.3.2`, forma de configuración descrita,
  puntero a la política de `@apply` en conventions. Sin restos de
  "aún no instalado".
- [x] **`pnpm build` y `./init.sh` en verde** → **reproducido por el reviewer**:
  `./init.sh` exit 0 (type-check OK, tests 27/27); `pnpm build` exit 0
  (vue-tsc + vite build, `dist/assets/index-DLpWp6Oe.css` 4.36 kB).
- [x] **Política de `@apply` respetada** → cero usos de `@apply` en `src/`
  (grep verificado). Única mención: el comentario de cabecera de
  `src/assets/main.css:1-3`, que documenta la excepción y el punto de
  `@reference`, exactamente como pide `docs/conventions.md` → Estilos/UI.

## Arquitectura (docs/architecture.md)

- [x] Sin lógica ni UI de negocio: `src/App.vue` sigue siendo shell tonto
  (`<RouterView />` + clases de shell). Sin `fetch(` en ningún `.vue`.
- [x] Ubicación de la CSS global en `src/assets/` correcta: es un asset de
  app, no código; no encaja en `features/`, `shared/` ni `services/`.
  Decisión razonada en `progress/impl_tailwind-setup.md`.
- [x] Dependencias nuevas justificadas: autorizadas por el propio intent
  (`delego_en_agente`), registradas en `docs/stack.md` y en la bitácora.
  Diff de `package.json` verificado: **solo** +`tailwindcss` y
  +`@tailwindcss/vite`. **Ningún UI kit ni dependencia extra.**

## Convenciones (docs/conventions.md)

- [x] Idioma inglés en código, comentarios y nombres de test.
- [x] Estilo: comillas simples, sin `;`, 2 espacios; orden SFC
  `<template>` → `<script setup lang="ts">` en `App.vue`; el `<style scoped>`
  vacío eliminado (coherente con utility-first).
- [x] Imports: orden vendor → alias → relativos respetado en `src/main.ts`
  (la CSS como side-effect en primera línea es el patrón del scaffold Vue).
- [x] Manejo de errores: no aplica (la feature no añade lógica).

## Verificación (docs/verification.md)

- [x] Tests usan los recursos correctos: montaje real de `App.vue` con stub
  mínimo de `RouterView` (frontera legítima del router); sin mocks
  innecesarios.
- [x] Tests verifican output concreto: presencia de clases con
  `wrapper.classes()`, existencia del outlet y relación padre-hijo del DOM
  (`src/__tests__/App.spec.ts:13-33`) — no solo "no lanza excepción".
- [x] Limitación de jsdom (no computa CSS) documentada: comentario en
  `src/__tests__/App.spec.ts:20-21` + sección "Nota jsdom vs. visual" del
  informe; complementada con verificación del CSS compilado en el build
  (reproducida en esta revisión).

## CHECKPOINTS.md

- [x] C1 — Arnés completo: archivos base y docs presentes; `./init.sh` exit 0
  (comprobado por init.sh mismo y reproducido).
- [x] C2 — Estado coherente: solo la feature 3 en `in_progress`; features
  `done` (1, 2) con tests que pasan (27/27); `progress/current.md` describe la
  sesión activa, sin basura.
- [x] C3 — Arquitectura: estructura conforme; 2 dependencias documentadas y
  autorizadas; sin `console.log` ni TODOs sueltos en los archivos tocados;
  convenciones respetadas.
- [x] C4 — Verificación real: 3 tests para el cambio, ejecutados en jsdom
  según `docs/verification.md`, todos pasan. Camino de error: no aplica en un
  setup de tooling sin lógica condicional (nota: la cobertura visual que jsdom
  no da se cubre con build + smoke, documentado).
- [x] C5 — Sesión: sin archivos sin trackear sospechosos (`src/assets/` y
  `progress/impl_tailwind-setup.md` pertenecen a la feature). La entrada de
  `history.md` de esta sesión se añade al cierre (sesión aún abierta;
  `current.md` al día). Status `in_progress` correcto hasta el `done` del
  implementer.
- [x] C6 — Proyectos hermanos: la feature no toca el contrato de la API; no
  hay endpoints ni tipos inventados.
- [x] C7 — SDD: no aplica (feature sin `"sdd": true`).
- [x] C8 — Resumen de cierre escrito: `progress/resumen_tailwind-setup.md`.

## Resumen de cierre (si APPROVED)

- Escrito en `progress/resumen_tailwind-setup.md` → **sí**

## Cambios requeridos (si aplica)

Ninguno.

## Notas no bloqueantes

1. Peer-deps preexistente (anterior a esta feature, ya anotado por el
   implementer): `eslint-plugin-oxlint@1.72.0` espera `oxlint ~1.72.0` y hay
   `1.73.0` (`package.json:38,44`). Alinear en una tarea de mantenimiento.
2. El hash/tamaño del CSS del build varía entre ejecuciones
   (4.34 kB → 4.36 kB); irrelevante, mismo contenido de utilidades.
