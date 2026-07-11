# Review — feature #1 `bootstrap`

**Veredicto:** APPROVED

Flujo simple (no SDD). Revisión independiente: no me fié del informe, reejecuté
todos los comandos y leí los archivos modificados uno a uno.

## Comandos reejecutados (resultado literal)

Desde `gastos-frontend/`. Todos exit 0.

| Comando | Exit | Evidencia |
|---------|------|-----------|
| `./init.sh` | **0** | Stack `node` detectado, runtime v24.11.0, arnés completo, `[OK] Type check OK`, `[OK] Entorno listo`. |
| `pnpm type-check` | **0** | `vue-tsc --build` sin errores. |
| `pnpm test:unit run` | **0** | `Test Files 1 passed (1)` / `Tests 1 passed (1)` (Vitest v4.1.10, jsdom). |
| `pnpm build` | **0** | `vite v8.1.3` → `✓ 26 modules transformed`, `dist/index.html` + `dist/assets/index-*.js` (86.21 kB), `✓ built in 91ms`. |

> Nota no bloqueante: pnpm emite `[WARN] Unsupported engine` (node v24.11.0 vs
> `>=24.12.0`). Es **preexistente** e infraestructural; no lo introduce esta
> feature y no rompe nada (todo verde). Correcto dejarlo fuera de scope.
> `init.sh` no corre Vitest por sí solo (busca script `"test"` exacto; aquí es
> `test:unit`) — comportamiento ya documentado en `docs/verification.md`; los
> tests se corrieron a mano y pasan.

## Criterios de aceptación (uno a uno)

- [x] **Arranca con un comando único** → `pnpm build` compila (exit 0) y
  `pnpm dev` (Vite) es el punto de arranque. `src/main.ts` monta la app con
  Pinia + Router. ✔
- [x] **`docs/stack.md` documenta lenguaje, framework y versiones** →
  TypeScript `~6.0.3`, Vue `^3.5.39`, Vite `^8.1.3`, Pinia `^3.0.4`, Vue Router
  `^5.1.0`, Vitest `^4.1.10`, más nota *Bootstrap (feature #1)* con la línea base
  confirmada (`docs/stack.md:96-103`). ✔
- [x] **`./init.sh` detecta el stack y termina en verde** → stack `node`,
  exit 0. ✔
- [x] **El árbol de `src/` sigue `docs/architecture.md`** → existen `features/`,
  `shared/`, `services/`, `router/`; el scaffold `src/stores/counter.ts` retirado
  y la carpeta `src/stores/` eliminada. Verificado con `find src` y `git status`.
  ✔

## Arquitectura (docs/architecture.md)

- [x] Estructura feature-based establecida (`src/features/`, `src/shared/`,
  `src/services/`), coincide con el árbol objetivo (`docs/architecture.md:50-68`).
- [x] `App.vue` es shell raíz mínimo (`<RouterView />`), sin lógica ni `fetch`.
- [x] `services/` queda solo con `.gitkeep`; **no** se coló `services/http.ts`
  (eso es feature #2). Verificado: `find src/services` → solo `.gitkeep`.
- [x] Sin dependencias nuevas: `package.json` mantiene solo pinia, vue,
  vue-router (deps) — no axios, no Tailwind, no librería de validación.

## Convenciones (docs/conventions.md)

- [x] Idioma **inglés** en código, tests y (ausencia de) comentarios.
- [x] Orden de bloques SFC en `App.vue`: `<template>` → `<script setup lang="ts">`
  → `<style scoped>` (`src/App.vue:1-7`).
- [x] Estilo: 2 espacios, comillas simples, sin punto y coma, LF — coherente en
  `App.vue` y `App.spec.ts`. type-check y build lo respaldan.
- [x] Test co-localizado en `src/__tests__/App.spec.ts`, nombre descriptivo en
  inglés (`renders the router outlet as the app shell`).

## Verificación (docs/verification.md)

- [x] El test monta `App` y **verifica output concreto**: comprueba que el outlet
  del router se renderiza (`wrapper.find('[data-test="router-view"]').exists()`),
  no solo "no lanza excepción" (`src/__tests__/App.spec.ts:16`).
- [x] Mock mínimo y legítimo: solo se stubea `RouterView` (frontera del router),
  no hay mocks innecesarios.
- [x] Nivel 2 (E2E) **no aplica**: bootstrap no aporta flujo de UI todavía
  (`router` con `routes: []`, sin pantallas). El shell queda cubierto por el
  unit test.

## Decisiones del implementer evaluadas

- **D1 — `App.vue` → shell con `<RouterView />` sin `import`.** Correcto: el
  plugin de vue-router registra `RouterView` global y aporta los tipos; type-check
  pasa. Coherente con `architecture.md` (App.vue = shell raíz, router = montaje).
  **Aprobada.**
- **D2 — borrar la carpeta `src/stores/` entera (no dejar `.gitkeep`).**
  **Aprobada, coherente.** El árbol objetivo de `docs/architecture.md:50-68` NO
  lista `stores/`; los stores viven por feature (`features/<feature>/store.ts`).
  La nota de convivencia reserva `src/stores/` como *destino conceptual* para
  estado transversal futuro (sesión), no como carpeta obligatoria ahora. Dejar un
  `src/stores/.gitkeep` vacío añadiría una carpeta fuera del árbol objetivo y
  podría leerse como "ya hay estado global aquí". Borrar es más limpio y se
  recreará cuando exista la necesidad. Buen criterio.
- **D3/D4 — pnpm y versiones base sin fijar nuevas.** Dentro de lo delegado por
  el `intent`; anotadas en `docs/stack.md`. **Aprobadas.**

## CHECKPOINTS.md

- [x] C1 — Arnés completo (AGENTS.md, init.sh, feature_list.json,
  progress/current.md, docs/*; init.sh exit 0).
- [x] C2 — Estado coherente (solo #1 en `in_progress`; current.md describe la
  sesión activa; ninguna feature `done` sin tests).
- [x] C3 — Arquitectura (estructura correcta, sin deps nuevas, sin debug logs ni
  TODOs — grep en `src/` sin coincidencias, convenciones respetadas).
- [x] C4 — Verificación real (un test ejecutable para el único módulo con render;
  verifica output concreto; pasa en el entorno de `docs/verification.md`).
- [x] C5 — Sin untrackeados sospechosos (`docs/`, `src/features|shared|services`
  son artefactos legítimos de la feature; `dist/` está en `.gitignore`; sin
  temporales ni logs). El cierre de sesión (mover a `history.md`) es posterior a
  esta review.
- [x] C6 — No toca el contrato con el backend; sin endpoints/tipos inventados.
- [x] C7 — N/A (feature #1 no es SDD).
- [x] C8 — Resumen de cierre escrito (ver abajo).

## Repo limpio

- `git status --porcelain`: solo `M src/App.vue`, `M src/__tests__/App.spec.ts`,
  `D src/stores/counter.ts`, y los untrackeados esperados (`docs/`, nuevos
  `.gitkeep`). Sin temporales, sin logs de debug, sin TODOs sueltos (grep en
  `src/` → 0 coincidencias de `console.*`/`TODO`/`FIXME`/`debugger`).

## Resumen de cierre

- Escrito en `progress/summaries/bootstrap.md` → **sí**.

## Cambios requeridos

Ninguno. El trabajo cumple los cuatro criterios de `acceptance`, respeta
arquitectura y convenciones, y las cuatro verificaciones terminan en verde.
