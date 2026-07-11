# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se añade aquí.
> No edites entradas anteriores. Solo añades al final.

---

<!--
Plantilla para cada entrada nueva:

## YYYY-MM-DD — Feature N: nombre_de_la_feature
- **Agente:** quién/qué modelo
- **Plan:** descripción breve del enfoque tomado
- **Cambios:** lista de archivos tocados (alto nivel, no diff)
- **Verificación:** resultado de ./init.sh, número de tests
- **Cierre:** estado final de la feature, próxima feature
-->

## 2026-07-08 — Feature 1: bootstrap

- **Agente:** `implementer` (orquestado por `leader`) + `reviewer`. Flujo simple
  (no SDD): se trabajó a partir del `acceptance`.
- **Plan:** dejar una línea de salida limpia y repetible — arranque con un solo
  comando y estructura de carpetas base *feature-based* según
  `docs/architecture.md`, sin lógica de negocio, sin cliente HTTP y sin Tailwind.
- **Cambios:**
  - Esqueleto feature-based en `src/`: `features/`, `shared/`, `services/`
    (carpetas con `.gitkeep`; `services/http.ts` queda para la feature #2).
  - `src/App.vue` convertido en shell raíz mínimo (`<RouterView />`), retirando el
    contenido demo del scaffold; `src/__tests__/App.spec.ts` actualizado para
    verificar el outlet del router.
  - Retirado el scaffold `src/stores/counter.ts` y eliminada la carpeta
    `src/stores/`.
  - `docs/stack.md` actualizado (versiones base confirmadas, sin dependencias
    nuevas, referencia colgante a `counter.ts` eliminada).
- **Decisiones:**
  - **D1** — `App.vue` pasa a shell raíz con `<RouterView />` sin `import`
    explícito (vue-router lo registra global y aporta los tipos). Coherente con
    `architecture.md`. Aprobada por el reviewer.
  - **D2** — se elimina la carpeta `src/stores/` completa (no se deja `.gitkeep`):
    el árbol objetivo no la lista y los stores van por feature; se recreará cuando
    exista estado transversal. Aprobada por el reviewer.
  - (Delegadas en el intent) pnpm como gestor de paquetes y versiones base sin
    fijar nuevas; **ninguna dependencia instalada**.
- **Verificación:** `./init.sh` → **exit 0** (stack `node` detectado, type-check
  OK). Reejecutado en el cierre: sigue en verde. `pnpm type-check`, `pnpm build`
  y `pnpm test:unit run` en verde (Vitest: 1 archivo / 1 test). Nota no
  bloqueante y preexistente: pnpm avisa `[WARN] Unsupported engine` (node
  v24.11.0 vs `>=24.12.0`).
- **Cierre:** feature #1 `bootstrap` → **done**. Reviewer: **APPROVED**, sin
  cambios requeridos (`progress/review_bootstrap.md`). Trazabilidad conservada en
  `progress/impl_bootstrap.md`, `progress/review_bootstrap.md` y
  `progress/resumen_bootstrap.md`. Próxima feature: #2 `fundamentos` (`pending`,
  SDD — requiere spec antes de implementar).

## 2026-07-10 — Feature 2: fundamentos

- **Agente:** `spec_author` + `implementer` + `reviewer` (orquestados por
  `leader`). Flujo **SDD**: spec en `specs/fundamentos/` aprobado por el
  humano antes de implementar; tasks T1–T13 ejecutadas en orden y marcadas `[x]`.
- **Plan:** capa transversal común, sin lógica de negocio: configuración por
  entorno tipada y validada al arrancar (fail-fast), jerarquía de errores con
  formato consistente `[<code>] <message>` + manejador global de Vue, cliente
  HTTP base reutilizable, y estructura feature-based consolidada.
- **Cambios:**
  - Creados: `.env.example`, `.env.development`, `.env.test` (committed, sin
    secretos); `src/shared/config.ts` (`AppConfig`, `loadConfig`, singleton
    `appConfig`); `src/shared/errors.ts` (`AppError` con `code`/`cause`,
    `ConfigError`, `ApiError` con `status`, `ValidationError`, `toAppError`,
    `formatError`, `handleGlobalError`); `src/services/http.ts` (`createHttp`
    + `http`); 3 specs co-localizados con 24 tests nuevos.
  - Modificados: `env.d.ts` (tipado de `VITE_API_URL`), `src/main.ts` (valida
    config antes de `mount` y registra `app.config.errorHandler`),
    `package.json` (script `"test": "vitest run"` para `init.sh`),
    `docs/architecture.md` (ADR-003 manejo de errores, ADR-004 validación
    manual de config, árbol actualizado), `docs/stack.md` (tabla de variables
    de entorno con `VITE_API_URL`, cliente HTTP hecho), `docs/verification.md`
    (retirado el aviso de que `init.sh` no ejecutaba Vitest).
  - Eliminados: `.gitkeep` de `src/shared/` y `src/services/`.
- **Decisiones:**
  - (Delegada a) patrón de errores de `docs/conventions.md` + manejador global
    en `app.config.errorHandler` → ADR-003.
  - (Delegada b) validación de config a mano, sin Zod (una sola variable hoy);
    revisar al consumir el primer endpoint → ADR-004.
  - (Añadidos aprobados en la puerta del spec) R3 (URL presente pero
    inválida), R14 (alias `"test"` en `package.json`) y `VITE_API_URL` como
    variable obligatoria concreta.
  - Detalle de implementación: `cause` declarado como propiedad propia de
    `AppError` (no `ErrorOptions` nativo) porque `tsconfig.vitest.json` usa
    `lib: []`; misma firma pública y comportamiento que el design.
- **Verificación:** `./init.sh` → **exit 0** con el bloque de tests activo
  (`pnpm test` → Vitest **25/25** en verde, sin el WARN anterior de tests);
  `pnpm type-check`, `pnpm lint` y `pnpm build` en verde. E2E omitido
  legítimamente (sin navegadores de Playwright instalados; condición prevista
  en T12). Trazabilidad completa R1–R14 → tests en
  `progress/impl_fundamentos.md`.
- **Cierre:** feature #2 `fundamentos` → **done**. Reviewer: **APPROVED**
  (`progress/review_fundamentos.md`); resumen humano en
  `progress/resumen_fundamentos.md`. Trazabilidad conservada en
  `progress/impl_fundamentos.md`. Próxima feature: #3 `tailwind-setup`
  (`pending`, flujo simple).

## 2026-07-10 — Feature 3: tailwind-setup

- **Agente:** `implementer` (orquestado por `leader`) + `reviewer`. Flujo simple
  (no SDD): se trabajó a partir del `acceptance`.
- **Plan:** dejar Tailwind CSS v4 instalado y configurado según la doc oficial
  de v4 para Vite (consultada vía ctx7): plugin `@tailwindcss/vite` +
  `@import 'tailwindcss'` en una CSS global, sin `tailwind.config.js` ni
  PostCSS; sin maquetar UI de negocio.
- **Cambios:**
  - `package.json` / `pnpm-lock.yaml`: +`tailwindcss` **4.3.2** y
    +`@tailwindcss/vite` **4.3.2** (devDependencies, exactas en lockfile).
  - `vite.config.ts`: registrado el plugin `tailwindcss()`.
  - Creado `src/assets/main.css` (CSS global, única entrada de Tailwind, con
    la excepción de `@apply`/`@reference` documentada en cabecera) e importado
    como primera línea de `src/main.ts`.
  - `src/App.vue`: clases de utilidad en el shell raíz (`min-h-screen
    bg-gray-50 text-gray-900 antialiased`); retirado el `<style scoped>` vacío.
  - `src/__tests__/App.spec.ts`: 3 tests (outlet del router, presencia de
    clases de utilidad, outlet dentro del wrapper).
  - `docs/stack.md`: sección *Estilos* con versiones exactas 4.3.2/4.3.2 y la
    forma de configuración; retirado el "Aún no instalado".
- **Decisiones:**
  - **D1** — CSS global en `src/assets/main.css` (ubicación estándar Vue/Vite
    para assets de app; `features/`/`shared/`/`services/` contienen código).
    Futuro destino de `@reference` si algún día aplica la excepción de `@apply`.
  - **D2** — cero `@apply` en el repo, conforme a la política de
    `docs/conventions.md` → *Estilos / UI*.
  - Nota jsdom: los unit tests verifican presencia de clases (jsdom no computa
    estilos); el render visual se cubrió con el build (utilidades presentes en
    `dist/assets/index-*.css`) y smoke con `pnpm dev` (servidor parado después).
- **Verificación:** `./init.sh` → **exit 0** (Vitest **27/27** en verde);
  `pnpm type-check`, `pnpm lint` y `pnpm build` en verde. Preexistente y no
  bloqueante: peer-dep `eslint-plugin-oxlint@1.72.0` vs `oxlint 1.73.0`.
- **Cierre:** feature #3 `tailwind-setup` → **done**. Reviewer: **APPROVED**
  (`progress/review_tailwind-setup.md`); resumen humano en
  `progress/resumen_tailwind-setup.md`. Trazabilidad conservada en
  `progress/impl_tailwind-setup.md`. No quedan features `pending` en
  `feature_list.json`.
