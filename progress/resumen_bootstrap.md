# Resumen — feature #1 `bootstrap`

Fecha de cierre: 2026-07-08
Intención original: `feature_list.json` → feature `bootstrap`, bloque `intent`
Spec (si SDD): no aplica (flujo simple)

## Qué hace ahora la app que antes no

Ahora el proyecto tiene una línea de salida limpia y repetible: arranca con un
solo comando (`pnpm dev`) y compila (`pnpm build`), sobre una estructura de
carpetas base *feature-based* lista para construir encima. Antes solo estaba el
scaffold por defecto de Vue (con el store de ejemplo `counter`), que no reflejaba
la arquitectura decidida.

## Por dónde se usa (puntos de entrada)

- `pnpm dev` — levanta el dev server de Vite en `http://localhost:5173`.
- `pnpm build` — type-check + build de producción a `dist/`.
- `./init.sh` — detecta el stack (`node`), valida el arnés y hace type-check.
- La app monta en `src/main.ts` (Pinia + Router) y renderiza el shell raíz
  `src/App.vue`, que expone el outlet del router.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Shell raíz de la app (`<RouterView />`) | `src/App.vue:1-7` |
| Bootstrap de la app (createApp + Pinia + Router) | `src/main.ts:7-12` |
| Router (rutas vacías, se poblará por feature) | `src/router/index.ts:3-8` |
| Test del shell raíz | `src/__tests__/App.spec.ts:7-17` |
| Carpetas base feature-based | `src/features/.gitkeep`, `src/shared/.gitkeep`, `src/services/.gitkeep` |
| Documentación del stack y versiones base | `docs/stack.md:96-103` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ "Cuando ejecuto el comando de arranque, el proyecto levanta sin errores" →
  se cumple; `pnpm build` compila (exit 0) y el shell raíz se monta. El render
  del shell está verificado en `src/__tests__/App.spec.ts:16`.
- ✅ "Cuando abro el repo, la estructura coincide con `docs/architecture.md`" →
  se cumple; existen `features/`, `shared/`, `services/`, `router/` y el scaffold
  `src/stores/counter.ts` se retiró. Verificado con `find src` y `git status`.
- ✅ "Cuando ejecuto `./init.sh`, detecta el stack y termina en verde" →
  se cumple; stack `node` detectado, exit 0.

## Decisiones que se tomaron por ti

Lo que el `intent` dejó delegado en el agente:

- (delegado) **Gestor de paquetes: pnpm** — ya fijado en el harness; se confirma
  como el runner del proyecto (`docs/stack.md:54`).
- (delegado) **Versiones exactas: no se fijan nuevas** — se confirma como línea
  base lo ya presente en `package.json` (TypeScript `~6.0.3`, Vue `^3.5.39`,
  Vite `^8.1.3`, Pinia `^3.0.4`, Vue Router `^5.1.0`, Vitest `^4.1.10`) y se
  anota en `docs/stack.md:96-103`. **No se instaló ninguna dependencia nueva.**
- (añadido) **`App.vue` pasa a shell raíz con `<RouterView />`** (antes tenía el
  contenido demo del scaffold). Es el esqueleto correcto según arquitectura.
- (añadido) **Se elimina la carpeta `src/stores/` completa** (no solo
  `counter.ts`): el árbol objetivo no la lista y los stores van por feature. Se
  recreará cuando haga falta estado transversal (p. ej. sesión).

## Qué NO se tocó / quedó fuera

- No hay cliente HTTP: `services/http.ts` queda para la feature #2 `fundamentos`.
- No se instaló Tailwind: queda para la feature #3 `tailwind-setup`.
- Sin lógica de negocio ni pantallas: el router va con `routes: []`.
- No se tocó la versión de Node del entorno ni el rango `engines`.

## Notas para el futuro (opcional)

- **Versión de Node.** El intérprete instalado (`v24.11.0`) no cumple el rango
  `engines` (`^22.18.0 || >=24.12.0`); pnpm avisa `[WARN] Unsupported engine` en
  cada comando. No bloquea (todo verde), pero conviene alinear el entorno o el
  rango en algún momento. Preexistente, fuera del scope de esta feature.
- **`init.sh` no corre Vitest** (busca un script `"test"` exacto y aquí es
  `test:unit`). Añadir un alias `"test"` o ajustar `init.sh` automatizaría el
  paso de tests unitarios; hoy se corren a mano (`pnpm test:unit run`).
