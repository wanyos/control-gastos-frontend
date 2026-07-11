# Informe de implementación — Feature #3 `tailwind-setup`

- **Feature:** #3 — Instalación y configuración de Tailwind CSS (no SDD)
- **Fecha:** 2026-07-10
- **Agente:** implementer
- **Estado en `feature_list.json`:** `in_progress` (a la espera de veredicto del reviewer)

## Archivos modificados / creados

| Archivo | Cambio |
|---------|--------|
| `package.json` / `pnpm-lock.yaml` | +`tailwindcss` `^4.3.2`, +`@tailwindcss/vite` `^4.3.2` (devDependencies; exactas en lockfile: **4.3.2** ambas) |
| `vite.config.ts` | Registrado el plugin oficial: `import tailwindcss from '@tailwindcss/vite'` + `tailwindcss()` en `plugins` |
| `src/assets/main.css` | **Nuevo.** Hoja de estilos global con `@import 'tailwindcss'` (única entrada de Tailwind) |
| `src/main.ts` | `import './assets/main.css'` como primera import (estilos disponibles antes de montar) |
| `src/App.vue` | Clases de utilidad en el shell raíz: `min-h-screen bg-gray-50 text-gray-900 antialiased`; eliminado el `<style scoped>` vacío (utility-first) |
| `src/__tests__/App.spec.ts` | 3 tests: outlet del router, presencia de clases de utilidad, outlet dentro del wrapper |
| `docs/stack.md` | Sección *Estilos* actualizada: versiones exactas 4.3.2, forma de configuración, retirado el "Aún no instalado" |
| `progress/current.md` | Bitácora de la sesión |

## Decisiones tomadas

1. **Forma de configuración (delegada en la feature):** la recomendada por la
   doc oficial de Tailwind v4 para Vite (consultada vía ctx7,
   `/tailwindlabs/tailwindcss.com`): plugin `@tailwindcss/vite` + `@import
   "tailwindcss"` en la CSS global. **Sin** `tailwind.config.js` ni PostCSS
   (v4 no los necesita con el plugin de Vite).
2. **Ubicación de la CSS global (delegada):** `src/assets/main.css` — la
   ubicación estándar del scaffold Vue/Vite para assets de app; no encaja en
   `features/`, `shared/` ni `services/` (que contienen código, según
   `docs/architecture.md`). Es el futuro destino de `@reference` si algún día
   aplica la excepción de `@apply`.
3. **Política de `@apply` respetada:** cero usos de `@apply` en el repo. La
   propia `main.css` documenta en cabecera la excepción (`@reference`) según
   `docs/conventions.md` → *Estilos / UI*.
4. **Componente de ejemplo:** `src/App.vue` (existente). Solo clases de shell
   (fondo, altura mínima, tipografía base) — nada de UI de negocio ni
   componentes nuevos. Con `pnpm dev` el fondo `bg-gray-50` a pantalla
   completa es visible aunque el router siga vacío.
5. **Orden de la import CSS en `main.ts`:** primera línea, separada del bloque
   vendor — side-effect import de estilos, patrón del scaffold oficial de Vue.

## Versiones instaladas (lockfile `pnpm-lock.yaml`)

- `tailwindcss@4.3.2`
- `@tailwindcss/vite@4.3.2`

## Verificación

### Nota jsdom vs. visual (docs/verification.md)

jsdom **no computa** los estilos de Tailwind: los unit tests verifican la
**presencia** de las clases de utilidad y la estructura del shell, no el
render visual. La comprobación visual queda cubierta por:

- **Build:** `dist/assets/index-*.css` contiene `.min-h-screen`, `.bg-gray-50`
  y `.antialiased` compiladas (verificado con grep tras `pnpm build`).
- **Smoke dev:** con `pnpm dev` levantado, `/src/assets/main.css` sirve el CSS
  compilado (`/*! tailwindcss v4.3.2 ...`). Servidor parado tras la
  comprobación (puerto 5173 libre).

### Gate completo

- `./init.sh` → verde (última ejecución abajo)
- `pnpm type-check` → verde (vue-tsc sin errores)
- `pnpm lint` → verde (oxlint + eslint sin errores)
- `pnpm build` → verde (`dist/assets/index-DzT8Qh70.css` 4.34 kB con las utilidades)
- `pnpm format` pasado sobre `src/` (sin diffs posteriores)

### Output del último `./init.sh` (resumen)

```
── 4. Type checking (tsc) ──────────────────────────────
[OK]    Type check OK (tsc sin errores)

── 5. Ejecutando tests ─────────────────────────────────
 Test Files  4 passed (4)
      Tests  27 passed (27)
[OK]    Todos los tests pasan

── 6. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Mapa acceptance → evidencia

| Acceptance | Evidencia |
|------------|-----------|
| Tailwind v4 instalado y configurado con `@tailwindcss/vite` | `package.json` + `pnpm-lock.yaml` (4.3.2); `tailwindcss()` en `vite.config.ts` |
| Hoja de estilos global que importa Tailwind, cargada en `main.ts` | `src/assets/main.css` (`@import 'tailwindcss'`) + primera import de `src/main.ts` |
| Clase de utilidad en componente de ejemplo renderiza con `pnpm dev` | `src/App.vue` (shell con `min-h-screen bg-gray-50 ...`); test `applies Tailwind utility classes on the app shell root`; smoke dev: CSS compilado servido en 5173 |
| `docs/stack.md` con versiones exactas | Sección *Estilos*: 4.3.2 / 4.3.2, sin "Aún no instalado" |
| `pnpm build` y `./init.sh` en verde | Outputs de arriba (build 154 ms; init.sh 27/27) |
| Política de `@apply` respetada | Cero `@apply` en el repo; excepción documentada en cabecera de `main.css` |

## Notas / fuera de scope (NO aplicado)

- **Peer-deps pre-existente (no relacionado con Tailwind):** `pnpm peers check`
  reporta `eslint-plugin-oxlint@1.72.0` quiere `oxlint ~1.72.0` y hay `1.73.0`.
  Existía antes de esta feature. Sugerencia: alinear versiones en una tarea de
  mantenimiento.
- **Sugerencia:** cuando exista la primera vista real, valorar mover las clases
  tipográficas base del shell a `@theme` en `main.css` si se definen tokens de
  diseño propios. No aplica todavía.
