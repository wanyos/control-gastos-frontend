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
pnpm test:unit          # modo watch (interactivo)
pnpm test:unit run      # una sola pasada, útil en CI / verificación
```

> `init.sh` detecta el script `"test"` de `package.json` (`pnpm test` →
> `vitest run`, añadido en la feature #2) y ejecuta la suite unitaria
> automáticamente en su bloque de tests, además del type-check.

### Nivel 2 — Test de integración / E2E (obligatorio para features de UI)

Los tests E2E usan **Playwright** contra la app real (levanta el dev server en
`5173`, o el preview en `4173` bajo CI). Viven en `e2e/`.

```bash
# Primera vez: instalar navegadores
npx playwright install

pnpm test:e2e                      # todos los navegadores (chromium/firefox/webkit)
pnpm test:e2e --project=chromium   # solo chromium (más rápido en local)
pnpm test:e2e e2e/vue.spec.ts      # un fichero concreto
pnpm test:e2e --debug              # modo debug
```

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

Cada `R<n>` de `specs/<name>/requirements.md` debe poder mapearse a al
menos un test concreto. El reviewer rechaza si falta cobertura.

El implementer documenta el mapa en `progress/impl_<name>.md`:

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

## Verificación final antes de cerrar

`init.sh` cubre el type-check (tsc) y la suite unitaria (`pnpm test`). El
gate completo antes de dar una feature por `done` es:

```bash
./init.sh              # entorno + type-check + tests unitarios → [OK] Entorno listo
pnpm type-check        # vue-tsc --build (incluye .vue; init.sh solo corre tsc)
pnpm lint              # oxlint + eslint sin errores
pnpm build             # el build de producción compila
```

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
