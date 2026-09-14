# Resumen — feature 12 `dependency-cleanup-and-upgrade`

Fecha de cierre: 2026-09-13 (pendiente de repetir `./init.sh` en verde tras reiniciar el dev server de `:5173`)
Intención original: `feature_list.json` → feature `dependency-cleanup-and-upgrade`, bloque `intent`
Spec (si SDD): no aplica

## Qué hace ahora la app que antes no

La app hace lo mismo y se ve igual; lo que cambia es lo de debajo. El proyecto
pasa de 32 a 20 librerías: se fue todo ESLint (el lint lo hace solo oxlint), el
plugin de Vue DevTools (ya no sale el botón flotante en `pnpm dev`) y dos
paquetes que no se usaban. El resto está en su última versión, con Vitest 5.
TypeScript se queda en 6.0.3 porque la 7 rompe `vue-tsc`.

## Por dónde se usa (puntos de entrada)

- `pnpm lint` — ahora solo ejecuta `oxlint . --fix`.
- `pnpm dev` — arranca sin el botón de Vue DevTools.
- `pnpm test:unit` — corre sobre Vitest 5.0.0, sin cambios en los tests.
- `pnpm install` — ya no hay `pnpm-workspace.yaml`.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Dependencias finales y script de lint | `package.json:14` |
| Plugins de Vite sin DevTools | `vite.config.ts:9` |
| Config de oxlint: categorías | `.oxlintrc.json:8` |
| Config de oxlint: las dos reglas apagadas | `.oxlintrc.json:24` |
| Config de oxlint: reglas de Vitest en tests | `.oxlintrc.json:27` |
| Tipos del DOM en los tests (antes venían de `@types/jsdom`) | `tsconfig.vitest.json:14` |
| Excepción de lint en la validación de la URL de la API | `src/shared/config.ts:59` |
| Ajuste trivial de lint (mismo valor) | `playwright.config.ts:54` |
| Protección contra `test.only` en CI | `playwright.config.ts:33` |
| Qué cubre oxlint y qué se pierde | `docs/stack.md:337` |
| Por qué TypeScript 7 no entra | `docs/stack.md:496` |
| Antigüedad mínima de versiones de pnpm | `docs/stack.md:523` |
| Auditoría paquete a paquete | `progress/implementation/dependency-cleanup-and-upgrade.md` |
| Test de humo e2e (sin cambios) | `e2e/app-boot.spec.ts:37` |

## Cumplimiento de la intención

- ✅ "No queda en package.json ninguna librería que no se use." → se cumple: cada una de las 20 tiene archivo de uso o razón en la auditoría del informe; el reviewer comprobó con grep que las 12 quitadas no tenían referencias.
- ✅ "El lint lo hace solo oxlint: ESLint y todos sus plugins y configuraciones han desaparecido." → se cumple: `package.json:14-15`, sin `eslint.config.ts` ni `.eslintcache`; grep del repo sin restos. `pnpm lint` en verde.
- ✅ "Ya no aparece el botón flotante de Vue DevTools en pnpm dev." → se cumple: `vite.config.ts:9`; el HTML de un `pnpm dev` limpio no carga nada de devtools.
- ✅ "Todas las librerías que quedan están en su última versión compatible, y si alguna no se puede subir sé por qué." → se cumple: `pnpm outdated` solo muestra `typescript` 7, explicado en `docs/stack.md:496`.
- ✅ "La app funciona igual que antes: arranca, se ve la vista de Patrimonio y pasan todos los tests." → se cumple: 254/254 tests, build con el mismo CSS que antes, e2e de humo `e2e/app-boot.spec.ts:37` verde contra dev y contra build. `./init.sh` queda por repetir tras reiniciar tu `pnpm dev` (el que tienes abierto se quedó sin sus ficheros al reinstalar).

## Decisiones que se tomaron por ti

- (delegado) oxlint con categorías `correctness` y `suspicious`, más las reglas de TypeScript que traía la config de ESLint y las de Vitest en los tests (`.oxlintrc.json`). Se apagan dos reglas que daban falsos positivos: ordenar copias con `.sort()` y helpers locales en tests.
- (delegado) Vitest 5 no necesitó ningún cambio de configuración ni de tests.
- (delegado) Las 33 exclusiones de `minimumReleaseAgeExclude` estaban caducadas; se borraron y, como el fichero no tenía nada más, `pnpm-workspace.yaml` desaparece.
- (añadido) `@vue/devtools-api` ya no se declara: la pone pnpm sola como peer de Pinia y además la trae Vue Router (`docs/stack.md:44`).

## Qué NO se tocó / quedó fuera

- No se lintea el `<template>` de los `.vue` (se pierden reglas como la `key` obligatoria en `v-for` o no mutar props).
- No hay reglas de lint para los tests de Playwright.
- TypeScript no sube a 7; pnpm no sube a 12.
- No se aplicó el consejo de rendimiento de Vitest 5 (`pool: 'vmThreads'`).

## Notas para el futuro (opcional)

- La regla apagada `unicorn/no-array-sort` es la que avisaría de un `.sort()` que muta una prop o el store; si se amplía `lib` a `ES2023.Array` se puede usar `toSorted()` y volver a encenderla.
- Reintentar TypeScript 7 cuando `vue-tsc` lo soporte.
