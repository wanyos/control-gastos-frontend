# Resumen — tarea de mantenimiento `dependency-upgrade-2026-10`

Fecha de cierre: 2026-10-04
Intención original: no es una feature de `feature_list.json`. Actualización de
dependencias pedida por el humano el 2026-10-04.
Revisión: `progress/reviews/dependency-upgrade-2026-10.md`

## Qué cambia

La app hace lo mismo que antes. Once dependencias pasan a su última versión
menor o de parche, y TypeScript se queda en la 6.0.3 porque la 7 sigue sin
funcionar con `vue-tsc`.

| Paquete | Antes | Ahora |
| --- | --- | --- |
| `vue` | 3.5.42 | 3.5.43 |
| `@lucide/vue` | 1.45.0 | 1.51.0 |
| `vite` | 8.3.0 | 8.3.2 |
| `@vitejs/plugin-vue` | 6.0.8 | 6.0.9 |
| `vitest` | 5.0.0 | 5.0.3 |
| `@vue/test-utils` | 2.5.0 | 2.5.1 |
| `jsdom` | 30.0.1 | 30.1.1 |
| `vue-tsc` | 3.3.11 | 3.3.12 |
| `oxlint` | 1.82.0 | 1.86.0 |
| `prettier` | 3.9.6 | 3.9.9 |
| `@types/node` | 26.5.1 | 26.6.4 |

## Por dónde se toca (puntos de entrada)

| Qué | Dónde |
| --- | --- |
| Los rangos de versión | [package.json:20](../../package.json#L20) |
| El procedimiento de actualización y por qué TypeScript 7 no entra | [docs/stack.md:620](../../docs/stack.md#L620) |

## Dónde está cada cosa

No se tocó ningún archivo de código ni de test.

| Qué | Dónde |
| --- | --- |
| Once rangos subidos; ninguna dependencia añadida ni quitada; cada rango conserva su tipo (`^`, `~` en `oxlint`, exacta en `prettier`) | [package.json](../../package.json) → `dependencies`, `devDependencies` |
| Versiones resueltas | [pnpm-lock.yaml](../../pnpm-lock.yaml) |
| Versiones citadas, línea «Última pasada» y la prueba de TypeScript 7 con fecha, versiones y error | [docs/stack.md](../../docs/stack.md) → «Mantenimiento de dependencias» |
| La versión de Prettier | [docs/conventions.md](../../docs/conventions.md) → «Formatter» |

## Cumplimiento de lo pedido

Ejecutado por el reviewer con las versiones nuevas:

- ✅ `./init.sh`: `exit=0`, 104 archivos de test, 1703 tests, e2e de chromium verde.
- ✅ `pnpm type-check`: `exit=0`.
- ✅ `pnpm build`: `exit=0`, 2108 módulos, JS 293.58 kB (gzip 90.58 kB).
- ✅ `pnpm peers check`: `No peer dependency issues found`.
- ✅ `pnpm outdated`: solo `typescript` 6.0.3 → 7.0.2.
- ✅ `pnpm install --frozen-lockfile`: `Already up to date`.
- ✅ TypeScript 7.0.2 con `vue-tsc` 3.3.12, repetido en una copia fuera del
  repositorio: `pnpm type-check` y `pnpm build` salen con 1
  (`ERR_PACKAGE_PATH_NOT_EXPORTED`, `./lib/tsc`). `typescript` queda en `~6.0.3`,
  igual que en `HEAD`.

## Qué NO se tocó / quedó fuera

- `typescript` (sigue en `~6.0.3`) y las ocho dependencias que `pnpm outdated`
  no listaba.
- No se creó `pnpm-workspace.yaml` ni ninguna exclusión de antigüedad mínima.
- `./init.sh` entero con TypeScript 7 instalado lo lanzó solo el implementer; el
  reviewer repitió su comando de tipos (`exit=0`), `pnpm type-check` y
  `pnpm build`.

## Notas para el futuro

- Con la subida de `jsdom` y de `vitest` cambian de versión mayor cinco
  dependencias indirectas, todas de los tests: `@asamuzakjp/css-color` 6 → 7,
  `@asamuzakjp/dom-selector` 8 → 9, `html-encoding-sniffer` 6 → 7,
  `w3c-xmlserializer` 5 → 6 (de `jsdom`) y `why-is-node-running` 2 → 3 (de
  `vitest`). Los tests pasan.
- `docs/stack.md:634` dice `ncu -u --target minor`; esta vez se usó
  `pnpm outdated` y `pnpm add`. `ncu` no es dependencia del proyecto, aunque
  está instalado de forma global en esta máquina (22.2.0).
- `./init.sh` no lanza `pnpm type-check` ni `pnpm build`: con TypeScript 7 su
  comando de tipos sale con 0 mientras `pnpm type-check` sale con 1.
- `feature_list.json:256` dice `progress/implementation/`; la carpeta es
  `progress/implementations/`.
- Reintentar TypeScript 7 cuando `vue-tsc` publique una versión posterior a la
  3.3.12.
