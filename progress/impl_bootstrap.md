# Informe de implementación — Feature #1 `bootstrap`

- **Feature:** #1 `bootstrap` — Bootstrap del proyecto
- **Flujo:** simple (no SDD). Se trabaja a partir del `acceptance`.
- **Agente:** `implementer`
- **Fecha:** 2026-07-08
- **Estado final en `feature_list.json`:** `in_progress` (NO se marca `done`;
  pendiente de veredicto del `reviewer`).

---

## 1. Alcance ejecutado

Solo el esqueleto, según el `intent` ("línea de salida limpia y repetible") y
`docs/architecture.md`. Sin lógica de negocio, sin cliente HTTP, sin Tailwind.

## 2. Archivos creados / modificados / borrados

### Creados (esqueleto feature-based, carpetas vacías con `.gitkeep`)
- `src/features/.gitkeep`
- `src/shared/.gitkeep`
- `src/services/.gitkeep` — solo la carpeta; `services/http.ts` es de la
  feature #2 `fundamentos`, aquí NO se crea.

### Modificados
- `src/App.vue` — convertido en shell raíz mínimo: `<RouterView />`. Retira el
  contenido demo del scaffold ("You did it! / Visit vuejs.org"). Orden de
  bloques respetado: `<template>` → `<script setup lang="ts">` → `<style scoped>`.
- `src/__tests__/App.spec.ts` — actualizado para verificar que el shell renderiza
  el outlet del router (stub de `RouterView`), en lugar del texto demo anterior.
- `docs/stack.md` — (a) corregida la referencia colgante a
  `src/stores/counter.ts` en la sección *Librerías clave* (el ejemplo se retiró);
  (b) añadida nota de *Bootstrap (feature #1)* en *Restricciones / decisiones de
  versionado* documentando versiones base confirmadas y que no se añadió ninguna
  dependencia.
- `progress/current.md` — bitácora actualizada en tiempo real.

### Borrados
- `src/stores/counter.ts` — scaffold de ejemplo (retirada autorizada por
  `docs/architecture.md`). No tenía test asociado ni lo importaba nadie
  (verificado con grep: única referencia era el propio fichero).
- Carpeta `src/stores/` — quedaba vacía tras borrar `counter.ts`; se elimina
  (ver decisión D2).

## 3. Árbol final de `src/` (coincide con `docs/architecture.md`)

```
src/
  App.vue          # shell raíz (<RouterView />)
  main.ts          # createApp + Pinia + Router (sin cambios)
  router/
    index.ts       # routes: [] (sin cambios)
  features/        # .gitkeep (vacío)
  shared/          # .gitkeep (vacío)
  services/        # .gitkeep (vacío) — http.ts queda para feature #2
  __tests__/
    App.spec.ts
```

## 4. Decisiones tomadas

- **D1 (procedencia: intent + architecture.md, mía a validar).** `App.vue` pasa
  de contenido demo a shell raíz con `<RouterView />`. Justificación: el `intent`
  pide "línea de salida limpia" y `architecture.md` define `App.vue` como
  "shell raíz" y `router/` como punto de montaje de las vistas por feature. Es
  el esqueleto correcto, no scaffold. La tarea autorizaba ajustar `App.vue`.
  No requiere `import` de `RouterView`: vue-router lo registra global (plugin en
  `main.ts`) y aporta los tipos globales para `vue-tsc`.
- **D2 (mía, a validar).** Elimino la carpeta `src/stores/` (no solo
  `counter.ts`). Motivo: el árbol objetivo de `docs/architecture.md` lista
  `features/ shared/ services/ router/` y NO incluye `stores/`; la nota de
  convivencia reserva `src/stores/` para estado transversal *futuro* (p. ej.
  sesión), no como carpeta requerida ahora. Se recreará cuando exista esa
  necesidad. Alternativa descartada: dejar `src/stores/.gitkeep` vacío (añadiría
  una carpeta que el árbol objetivo no pide).
- **D3 (gestor de paquetes).** pnpm — ya decidido en el harness, no reabierto.
- **D4 (versiones).** No se fijan versiones nuevas: se confirman como línea base
  las ya presentes en `package.json` (TypeScript `~6.0.3`, Vue `^3.5.39`, Vite
  `^8.1.3`, Pinia `^3.0.4`, Vue Router `^5.1.0`, Vitest `^4.1.10`) y se anotan
  en `docs/stack.md`. **No se instaló ninguna dependencia nueva.**
- **Pinia se mantiene** registrado en `main.ts`: es dependencia base del stack
  (los stores por feature la usarán), no scaffold demo.

## 5. Autoverificación (evidencia)

Todos los comandos ejecutados desde `gastos-frontend/`. Nota transversal: pnpm
emite un `[WARN] Unsupported engine` (node v24.11.0 vs `>=24.12.0` pedido en
`engines`) — es **preexistente**, no lo introduce esta feature (ver §6).

| Comando | Resultado |
|---------|-----------|
| `pnpm format` | exit 0 (prettier) |
| `pnpm lint` | exit 0 (oxlint + eslint, sin errores) |
| `pnpm type-check` | exit 0 (`vue-tsc --build`) |
| `pnpm test:unit run` | exit 0 — **Test Files 1 passed (1) / Tests 1 passed (1)** |
| `pnpm build` | exit 0 — `vite build` ✓ built (26 módulos, dist/index.html + chunk) |
| `pnpm dev` | Levanta OK — `VITE v8.1.3 ready`, `http://localhost:5173/` responde **HTTP 200** sin errores (server detenido tras la comprobación) |
| `./init.sh` | **exit 0** |

### Cobertura de tests
- `src/__tests__/App.spec.ts` → monta `App` y afirma que renderiza el outlet
  del router (shell raíz). Es el único módulo con render en esta feature; el
  resto del esqueleto son carpetas vacías sin lógica que testear.

### Output literal del último `./init.sh`
```
── 4. Type checking (tsc) ──────────────────────────────
[INFO]  Ejecutando: npx tsc --noEmit
[OK]    Type check OK (tsc sin errores)

── 5. Ejecutando tests ─────────────────────────────────
[WARN]  No hay comando de tests configurado para el stack 'node'
[WARN]  Esto es OK al inicio del proyecto. Cuando añadas tests, edita esta sección.

── 6. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
=== init exit: 0 ===
```

> Nota sobre `init.sh`: su detección de tests busca un script `"test"` exacto en
> `package.json` (aquí son `test:unit`/`test:e2e`), por lo que **no** corre
> Vitest automáticamente (ya documentado en `docs/verification.md`). Los tests
> se ejecutaron a mano con `pnpm test:unit run` → verde.

## 6. Sugerencias fuera de scope (NO aplicadas)

- **Versión de Node.** El intérprete instalado es `v24.11.0`, que **no** cumple
  el rango `engines` `^22.18.0 || >=24.12.0`; pnpm lo avisa en cada comando
  (`[WARN] Unsupported engine`). No bloquea (todo pasa en verde), pero conviene
  alinear la versión de Node del entorno o el rango de `engines`. Es preexistente
  y de infraestructura; no se toca en esta feature.
- **Alias `"test"` en `package.json`** para que `init.sh` ejecute Vitest en su
  sección 5 automáticamente (hoy solo hace type-check). Es cambio de harness,
  fuera del alcance del bootstrap.

## 7. Comprobación contra `acceptance`

- [x] "El proyecto arranca con un comando único" → `pnpm dev` levanta en 5173
      (HTTP 200) y `pnpm build` compila. ✔
- [x] "Documentado en `docs/stack.md` lenguaje, framework y versiones" →
      actualizado (nota de bootstrap con versiones base). ✔
- [x] "`init.sh` detecta el stack y termina en verde" → stack `node` detectado,
      exit 0. ✔
- [x] "El árbol de carpetas inicial sigue `docs/architecture.md`" →
      `features/`, `shared/`, `services/`, `router/`; scaffold `counter.ts`
      retirado. ✔

## 8. Estado del repositorio

`git status --porcelain`:
```
 M src/App.vue
 M src/__tests__/App.spec.ts
D  src/stores/counter.ts
?? docs/
?? src/features/
?? src/services/
?? src/shared/
```
- `dist/` está en `.gitignore` (sin artefactos de build sueltos).
- `docs/` ya estaba untracked al inicio de la sesión (no lo introduce esta
  feature).
- Sin ficheros temporales ni logs de debug.

---

**Siguiente paso:** lanzar `reviewer` para validar contra `acceptance` y
`CHECKPOINTS.md`. NO marcar `done` hasta veredicto `APPROVED` + existencia de
`progress/resumen_bootstrap.md`.

---

**CIERRE (2026-07-08):** reviewer `APPROVED` (sin cambios requeridos) y
`progress/resumen_bootstrap.md` presente. `./init.sh` reejecutado en el cierre →
**exit 0**. Feature #1 `bootstrap` marcada `status: "done"` en
`feature_list.json`; resumen de cierre movido a `progress/history.md`;
`progress/current.md` vaciado a la plantilla. Sesión cerrada.
