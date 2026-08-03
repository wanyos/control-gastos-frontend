# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ — tarea de **mantenimiento**: actualizar dependencias
- **Inicio:** 2026-08-03
- **Agente:** leader (trabajo sobre configuración: `package.json`, tsconfig, docs)

## Plan

Subir las 21 dependencias que `ncu` reportaba desatendidas, **por fases**, con
verificación entre cada una para poder aislar qué rompe si algo rompe.

| Fase | Qué | Estado |
|---|---|---|
| 0 | Línea base `./init.sh` | ✅ verde |
| 1 | 18 paquetes minor/patch de golpe | ✅ verde |
| 2 | `jsdom` 29 → 30 | ✅ verde |
| 3 | `pinia` 3 → 4 | ✅ verde |
| 4 | `typescript` 6 → 7 | ⛔ **descartado**, rompe el type-check |
| 5 | Verificación final | ✅ verde |

## Bitácora

- **Fase 0** — `./init.sh` verde antes de tocar nada: Node v24.18.0, type-check
  sin errores, 6 ficheros de test / 49 tests.
- **Fase 1** — `ncu -u --target minor` (18 paquetes). Verde: type-check, 49
  tests, `pnpm build`, `oxlint` y `eslint` limpios.
  - Vite 8.2 avisaba de que su futuro `configLoader: 'native'` no resolverá el
    `import viteConfig from './vite.config'` sin extensión de `vitest.config.ts`.
    Añadida la extensión `.ts` + `allowImportingTsExtensions: true` en
    `tsconfig.node.json` (seguro: ese proyecto es `noEmit`). Aviso silenciado.
- **Fase 2** — `jsdom` 30.0.1. Verde. Exige Node `^22.22.2 || ^24.15.0 ||
  >=26.0.0`, más estricto que el `engines` que declaraba el proyecto. **Decisión
  del humano:** subir el suelo de `engines` para que coincida, en vez de dejar
  el hueco como trampa latente. Documentado en `docs/stack.md`.
- **Fase 3** — `pinia` 4.0.2. Dos rupturas: es ESM-only (sin efecto, el proyecto
  ya es `type: module`) y **`@vue/devtools-api` pasa a peer NO opcional de
  instalación manual** → añadida `@vue/devtools-api@^8.2.1` a `dependencies`.
  Verde. Detectado con `pnpm peers check`.
- **Fase 4** — `typescript` 7.0.2 **revertido a `~6.0.3`**. La config del
  proyecto sí es compatible con TS 7 (no usa nada de lo que la 7 elimina), pero:
  1. `vue-tsc` 3.3.9 **ni arranca**: `ERR_PACKAGE_PATH_NOT_EXPORTED` al resolver
     `typescript/lib/tsc` (TS 7 cambió sus `exports`). Tumba `pnpm type-check`
     y por tanto `pnpm build`.
  2. `typescript-eslint` declara peer `>=4.8.4 <6.1.0`, y sigue igual en su
     última versión (8.66.0). Entra vía `@vue/eslint-config-typescript`.

  Razonamiento y condiciones para reintentarlo, en `docs/stack.md` →
  *Mantenimiento de dependencias*.
- **Fase 5** — verificación final: `./init.sh` verde (49 tests), `pnpm build`
  verde, `oxlint` y `eslint` sin hallazgos, `prettier --check src/` limpio,
  `pnpm peers check` sin incidencias. El CSS de producción conserva el mismo
  hash que antes de la actualización (`index-C9zTJsPb.css`): la capa de estilos
  y los tokens no se han movido.

## Fuera de scope (detectado, NO tocado)

- **`e2e/vue.spec.ts` está roto desde la feature #1** y no lo ha roto esta
  actualización: espera `<h1>You did it!</h1>` (scaffold original de Vue) y
  `App.vue` solo pinta `<RouterView />` con el router en `routes: []`. Falla en
  chromium, firefox y webkit. No lo detecta nadie porque `./init.sh` solo
  ejecuta `pnpm test` (Vitest), nunca el e2e. Merece su propia tarea: o se
  reescribe el test contra la app real, o se borra hasta que haya una pantalla.
- **`@types/jsdom` (^28.0.3) va por detrás de `jsdom` (30.0.1)**, pero es la
  última publicada y ningún fichero de `src/` importa tipos de jsdom, así que
  hoy no molesta.

## Próximo paso

Mantenimiento terminado. Nada pendiente de esta tarea; el repo queda verde.
