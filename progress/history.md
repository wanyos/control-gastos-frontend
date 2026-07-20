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
  cambios requeridos (`progress/reviews/bootstrap.md`). Trazabilidad conservada en
  `progress/implementation/bootstrap.md`, `progress/reviews/bootstrap.md` y
  `progress/summaries/bootstrap.md`. Próxima feature: #2 `fundamentos` (`pending`,
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
  `progress/implementation/fundamentos.md`.
- **Cierre:** feature #2 `fundamentos` → **done**. Reviewer: **APPROVED**
  (`progress/reviews/fundamentos.md`); resumen humano en
  `progress/summaries/fundamentos.md`. Trazabilidad conservada en
  `progress/implementation/fundamentos.md`. Próxima feature: #3 `tailwind-setup`
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
  (`progress/reviews/tailwind-setup.md`); resumen humano en
  `progress/summaries/tailwind-setup.md`. Trazabilidad conservada en
  `progress/implementation/tailwind-setup.md`. No quedan features `pending` en
  `feature_list.json`.

## 2026-07-20 — Feature 4: design-tokens

- **Agente:** `implementer` (orquestado por `leader`) + `reviewer`. Flujo simple
  (no SDD): se trabajó a partir del `intent` + `acceptance`.
- **Plan:** cargar los tokens del design system **control·cuentas** y exponerlos
  como utilidades de Tailwind v4, con el enfoque **híbrido** decidido por el
  humano — copia literal de los CSS de tokens a `src/assets/styles/` (re-copiable
  si el design system se regenera) + una capa `@theme inline` encima en
  `src/assets/main.css` que los mapea a los namespaces de Tailwind. La carpeta de
  referencia se mueve fuera de `src/` y se conserva íntegra. Sin portar ningún
  componente de React ni maquetar pantallas. **Cero dependencias nuevas.**
- **Cambios:**
  - Movido `src/design-system-source/` → `design-system/` (raíz, 83 archivos,
    íntegra; estaba untracked → `mv`). Queda fuera del type-check
    (`tsconfig.app.json` incluye solo `src/**/*`), del lint (`eslint.config.ts`
    `globalIgnores` + `.oxlintrc.json` `ignorePatterns`), de Prettier
    (`.prettierignore`, nuevo) y del escaneo de Tailwind (`@source not`).
  - Creados: `src/assets/styles/fonts.css`, `src/assets/styles/tokens/`
    (`colors.css`, `typography.css`, `spacing.css`, `base.css`) — copias de la
    fuente sin alterar **ningún valor**; el único cambio son los 7 alias de color
    `--text-*` → `--ink-*` en `colors.css` y sus usos en `base.css`.
  - `src/assets/main.css`: `fonts.css` primero de todo, luego
    `@import 'tailwindcss'`, luego los tokens, y una capa `@theme inline` de 47
    entradas que mapea cada alias a `var(--token)` (nunca a un valor literal).
  - `src/App.vue`: `bg-gray-50 text-gray-900` → `bg-surface-app text-ink-body`.
  - Tests: `src/assets/__tests__/styles.spec.ts` (10 tests nuevos) y
    `src/__tests__/App.spec.ts` reescrito (afirma los tokens + aserción negativa
    contra el retorno de `bg-gray-50`).
  - Docs: `docs/stack.md` (sección *Design system y tokens*, tabla de
    equivalencias de los 7 renombrados, mapa de utilidades) y
    `docs/conventions.md` (*Estilos / UI*: se maqueta con los alias semánticos;
    la guía de CONTENIDO del design system **no** se adopta).
- **Decisiones:**
  - **D1** — bordes expuestos como `--color-line-*` → `border-line-subtle`, no
    `border-*`. Aplanar a `--color-strong` habría generado `text-strong` como
    color de *borde*, colisionando con `text-ink-strong` (color de *texto*).
    Aprobada por el reviewer. No toca la copia: los tokens siguen llamándose
    `--border-*`.
  - **D2** — copia con la estructura espejo de la fuente (`tokens/`), para que
    re-copiar sea un `cp -r` y comprobar un `diff -r`.
  - **D3** — `.prettierignore` nuevo: `pnpm format` reformateaba las copias y
    rompía la identidad byte a byte con la fuente.
  - **Hallazgo 1** — `--shadow-*` **no** encajaba solo: Tailwind incrusta sus
    propios valores de sombra e ignora el `:root`. Mapeadas las 7 explícitamente.
  - **Hallazgo 2** — las webfonts no se cargaban: un `@import` remoto solo
    sobrevive al build si no le precede nada → `fonts.css` va el primero.
  - **Cierre (2026-07-20)** — restaurado `vueDevTools()` en `vite.config.ts`.
    Arrastraba una eliminación sin commitear ajena a esta feature (nota 2 del
    reviewer); decisión del humano: revertir. `vite.config.ts` queda **sin diff
    contra HEAD**. Se deja la llamada desnuda a propósito: el botón flotante de
    las DevTools no tiene opción de plugin para ocultarse (verificado en la doc
    oficial); se alterna con `Alt+Shift+D` y existe la ventana aparte en
    `/__devtools__/`. Es preferencia de runtime, no configuración.
- **Verificación:** gate completo re-ejecutado en el cierre, los cuatro en verde:
  `./init.sh` → **exit 0** (type-check OK, Vitest **37/37**, 5 archivos);
  `pnpm type-check` → exit 0; `pnpm lint` → exit 0 (oxlint + eslint, y `--fix` no
  cambia nada); `pnpm build` → exit 0 (`dist/assets/index-DkEZ2Yoc.css` 15.76 kB
  │ gzip 4.27 kB). Tests: 27 → **37**. La prueba real de una feature de CSS no la
  dan los unit tests (jsdom no computa Tailwind) sino el navegador: verificado
  por el implementer **y reproducido por el reviewer** en Chromium sobre estilos
  computados — `body` con `--surface-app` (`rgb(247,249,251)`), `--font-sans`
  (Hanken Grotesk) y 14px; `shadow-sm` con la sombra del diseño; `bg-brand`
  `#0A8F5F`; las 3 webfonts en `document.fonts`.
- **Deuda técnica pendiente (detectada por el reviewer, NO arreglada aquí):**
  el CSS de producción sale en **15.76 kB en vez de los 9.79 kB** que medía el
  implementer a mitad de feature. No es un fallo del cableado: es la detección
  automática de fuentes de Tailwind v4. Al excluir `design-system/` (acertado) se
  pasó por alto que Tailwind **también escanea los `.md` del arnés**, y esta
  feature llenó `docs/stack.md` de tablas que enumeran todas las utilidades.
  Comprobado en `dist/assets/index-*.css`: se emiten `.bg-chart-3`,
  `.fill-chart-3`, `.text-positive`, `.bg-negative-subtle`, `.border-line-subtle`,
  `.rounded-pill`, `.text-ink-muted`, `.container` (×6), `.flex`, `.grid`,
  `.text-red-500` y `.text-gray-900` — **ninguna** se usa en `src/`;
  `text-red-500` y `bg-gray-50` vienen literalmente de los ejemplos de
  `docs/conventions.md` y de `App.spec.ts`. No afecta a lo que pinta la app y no
  estaba en el `acceptance`, pero **crece con cada documento que se escriba**.
  **La solución pasa por acotar `@source` en `src/assets/main.css`**: limitarlo a
  `src/`, o añadir `@source not` para `docs/`, `progress/` y `specs/`; después
  comprobar que el bundle vuelve a la zona de los 10 kB. Merece su propia tarea
  de mantenimiento.
- **Otra deuda anotada (preexistente, ajena a esta feature):** `e2e/vue.spec.ts`
  sigue siendo el scaffold y espera un `<h1>You did it!</h1>` inexistente desde
  la #1 (no entra en el gate: `init.sh` no corre E2E); `pnpm preview` no monta la
  app por falta de `.env.production` (fail-fast correcto de la #2); webfonts por
  CDN sin build offline; iconos Lucide sin instalar; formato de moneda/fechas por
  decidir.
- **Cierre:** feature #4 `design-tokens` → **done**. Reviewer: **APPROVED**, sin
  cambios requeridos (`progress/reviews/design-tokens.md`); resumen humano en
  `progress/summaries/design-tokens.md`. Trazabilidad conservada en
  `progress/implementation/design-tokens.md`. No quedan features `pending` en
  `feature_list.json`.
