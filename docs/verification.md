# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.
> Toda feature termina con evidencia ejecutable, no con afirmaciones.
>
> Los comandos de esta sección están **descubiertos de `package.json`** y son
> reales. Las políticas (qué exigir en cada nivel) las confirma el humano.

## Niveles de verificación

### Nivel 1 — Tests unitarios (obligatorio)

Toda función / composable / store / componente con lógica en `src/` tiene al
menos un test que:

1. Cubre el camino feliz.
2. Cubre al menos un camino de error / borde si puede fallar.

**Comando para ejecutar los tests unitarios** (Vitest, entorno jsdom):

```bash
pnpm test:unit          # una sola pasada (es lo que corre init.sh y la puerta)
```

> `init.sh` detecta el script de tests unitarios de `package.json`
> (`test:unit` → `vitest run`, añadido en la feature #2) y ejecuta la suite
> automáticamente en su bloque de tests, además del type-check. Desde la
> feature #6 también ejecuta el **e2e smoke limitado a chromium**
> (sección 8 del script). Desde la higiene del 2026-09-30 ejecuta además
> **lint y formato** (secciones 5 y 6); ver *Qué comprueba la puerta*.

### Nivel 2 — Test de integración / E2E (obligatorio para features de UI)

Los tests E2E usan **Playwright** contra la app real (levanta el dev server en
`5173`, o el preview en `4173` bajo CI). Viven en `e2e/`. La feature #6 los
convirtió en una **prueba de humo de arranque real**: la app monta, aplica el
design system y no suelta errores de consola (ver `docs/stack.md` → *E2E en
cada modo*).

```bash
# Primera vez: instalar navegadores
npx playwright install

pnpm test:e2e                      # todos los navegadores (chromium/firefox/webkit)
pnpm test:e2e --project=chromium   # solo chromium (más rápido en local)
pnpm test:e2e --debug              # modo debug
HEADED=1 pnpm test:e2e             # con ventanas visibles (por defecto es headless)

# Modo CI (build de producción servido por preview en 4173):
pnpm build && CI=true pnpm test:e2e
```

La puerta de `./init.sh` (sección 8) ejecuta el e2e limitado a chromium contra
el dev server y termina en rojo si falla; si faltan los navegadores de
Playwright, degrada con un aviso claro en vez de fallar.

Para componentes, la integración ligera (montar el componente y comprobar
render/interacción) se hace con Vitest + `@vue/test-utils` en el Nivel 1.

### Nivel 3 — Smoke test manual (opcional pero recomendado)

Flujo mínimo antes de cerrar sesión:

```bash
pnpm dev            # abre http://localhost:5173 y comprueba el flujo a mano
# o, más cercano a producción:
pnpm build && pnpm preview   # sirve el build en http://localhost:4173
```

### Nivel 4 — Trazabilidad de requirements (obligatorio para features con `"sdd": true`)

Cada `R<n>` de `specs/<nn>-<name>/requirements.md` debe poder mapearse a al
menos un test concreto. El reviewer rechaza si falta cobertura.

El implementer documenta el mapa en `progress/implementation/<name>.md`:

```markdown
## Trazabilidad
- R1 → `test_xxx`
- R2 → `test_yyy`
- R3 → `test_zzz`
```

Ver `docs/specs.md` para el proceso SDD completo y la notación EARS.

## Anti-patrones (no hacer)

- ❌ "He añadido la feature, debería funcionar." → falta test ejecutable.
- ❌ Test que solo verifica que la función no lanza excepción. → tiene que
  comprobar el resultado concreto.
- ❌ Mocks excesivos del entorno cuando un recurso real (tempdir, sqlite
  in-memory) es viable.
- ❌ Marcar la feature como `done` sin pasar `./init.sh`.
- ❌ Añadir tests que solo se llaman a sí mismos (espejos del código).

## Qué comprueba la puerta (`./init.sh`)

> Reescrito en la higiene del **2026-09-30**. Hasta entonces el script decía
> «Entorno listo» **sin haber pasado el linter**, y no existía ninguna
> comprobación de formato. Por eso un `pnpm lint` en rojo (un
> `no-underscore-dangle`) llegó vivo hasta la revisión de la feature #23.

Orden de los pasos, de arriba abajo. Cualquiera que falle pone `EXIT_CODE=1` y
el script termina con `[FAIL] Entorno NO está listo`:

| # | Paso | Comando real |
|---|------|--------------|
| 1 | Detección de stack | — |
| 2 | Archivos base del arnés | — |
| 3 | `feature_list.json` + specs de las features `sdd` | — |
| 4 | Type check | `npx tsc --noEmit` |
| 5 | **Lint (nuevo)** | `pnpm lint:oxlint:check` → `oxlint .` |
| 6 | **Formato (nuevo)** | `pnpm format:check` → `prettier --check …` |
| 7 | Tests unitarios | `pnpm test:unit` |
| 8 | E2E smoke | `pnpm test:e2e --project=chromium` |
| 9 | Resumen | — |

### Arreglar vs. comprobar: dos parejas de scripts

Una puerta de verificación **comprueba, no arregla**: si modificara archivos, el
verde sería una consecuencia de la propia puerta y no una propiedad del código.
Por eso cada herramienta tiene dos entradas:

| Uso a mano (**arregla**) | Puerta (**no arregla**) |
|---|---|
| `pnpm lint` → `run-s "lint:*"` → `oxlint . --fix` | `pnpm lint:oxlint:check` → `oxlint .` |
| `pnpm format` → `prettier --write …` | `pnpm format:check` → `prettier --check …` |

Las dos variantes de cada pareja miran **exactamente lo mismo** (mismas rutas,
misma config); solo cambia si escriben en disco.

> **Por qué el nombre es `lint:oxlint:check` y no `lint:check`.** `pnpm lint` es
> `run-s "lint:*"`, y ese glob **sí** captura `lint:check` (comprobado), así que
> el uso a mano habría pasado a correr también la comprobación. El `*` de
> npm-run-all no cruza los dos puntos, de modo que `lint:oxlint:check` queda
> fuera del glob y `pnpm lint` se comporta igual que siempre. Si algún día se
> añade otro linter, su variante de comprobación sigue el mismo patrón
> (`lint:<herramienta>:check`).

## Verificación final antes de cerrar

Desde la higiene del 2026-09-30 `./init.sh` cubre también lint y formato, así
que el gate a mano se reduce a lo que el script **no** hace (`vue-tsc` sobre
`.vue` y el build de producción):

```bash
./init.sh              # entorno + type-check + lint + formato + unit + e2e → [OK] Entorno listo
pnpm type-check        # vue-tsc --build (incluye .vue; init.sh solo corre tsc)
pnpm build             # el build de producción compila
```

`pnpm lint` ya no hace falta en el cierre (la puerta lo cubre sin `--fix`);
úsalo mientras trabajas, para que te arregle lo arreglable.

Si algo de lo anterior está rojo, **no** marques nada como `done`. Anota el
bloqueo en `progress/current.md` y pon la feature en `blocked` en
`feature_list.json`.

## Criterios mínimos por feature

> Plantilla mental al cerrar una feature:

- [ ] La feature cumple TODOS los criterios de su `acceptance` en `feature_list.json`.
- [ ] Hay tests que cubren los criterios de aceptación (no solo el "happy path").
- [ ] `./init.sh` termina verde.
- [ ] El reviewer ha emitido veredicto `APPROVED`.
- [ ] `progress/current.md` describe lo que se hizo.
