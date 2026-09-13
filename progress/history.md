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
  > **RESUELTA por la feature #5 `tailwind-source-whitelist` (2026-07-21).** No la
  > retomes: el escaneo ya está acotado a `src/` con `source('../')` y el bundle
  > bajó a 9.67 kB. Anotación añadida al cerrar la #5; el texto original de esta
  > entrada no se ha modificado. Ver la entrada de la #5 más abajo.
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

## 2026-07-21 — Feature 5: tailwind-source-whitelist

- **Agente:** `implementer` (orquestado por `leader`) + `reviewer`. Flujo simple
  (no SDD): se trabajó a partir del `intent` + los 8 criterios de `acceptance`.
- **Plan:** invertir el enfoque del escaneo de Tailwind v4 — de ir excluyendo
  carpetas una a una (juego de topos) a **declarar dónde vive el código**. Base
  del escaneo reanclada a `src/` con `source()` en el `@import`, más `index.html`
  declarado a mano; la exclusión de `design-system/` desaparece por redundante.
  Cero cambios visuales, cero dependencias nuevas, ningún token tocado.
- **Cambios:**
  - `src/assets/main.css`: `@import 'tailwindcss' source('../')` (el fichero vive
    en `src/assets/`, luego `'../'` = `src/`) + `@source '../../index.html'`;
    eliminado `@source not '../../design-system'` y su comentario. Diff acotado a
    las líneas 10-20, el bloque del `@import`; `@theme inline` y
    `src/assets/styles/**` intactos.
  - Creado `src/assets/__tests__/tailwind-sources.spec.ts` (12 tests): compila el
    bundle de producción **real** con la API de Vite (`build({ write: false })`) y
    asevera sobre el CSS emitido, no sobre la configuración.
  - `docs/stack.md`: nueva sección *Qué ficheros escanea Tailwind (lista blanca)*
    (mecánica, porqué, la trampa práctica y el aviso de que `src/` se escanea
    entero, tests incluidos); nota 4 reescrita para no dejar colgando el
    `@source not` eliminado.
  - `feature_list.json`: `pending` → `in_progress` → `done`.
- **Decisiones:**
  - **D-a** — test de **efecto**, no de configuración. Un `grep` de `source('../')`
    en `main.css` seguiría verde si el escaneo se ensanchara por otra vía (un
    `@source` nuevo, un plugin), que es justo el fallo silencioso que la feature
    evita. Coste medido: ~1 s; la suite entera sigue en 1,7 s.
  - **D-b** — los nombres de clase del test se **componen en runtime**
    (`probe('bg-', 'chart-3')`). Escritos literales, Tailwind los emitiría desde
    el propio spec (que ahora está dentro de la lista blanca) y la aserción «no
    está en el bundle» no podría fallar nunca.
  - **D-c** — el test **se autovigila**: cada sonda se valida antes de usarse
    (sigue citada fuera de `src/`, no se usa dentro), para que no degrade a verde
    trivial si la documentación deja de nombrarla.
  - **D-d** — `index.html` **declarado explícitamente**, no solo documentado.
    Verificado con evidencia: sin la línea, una clase puesta en `<body>` se cae
    del CSS **sin ningún error de build**. Es una inclusión fija y conocida, no
    una exclusión reactiva, así que no reabre el juego de topos.
- **Verificación:** gate completo, ejecutado por el implementer, **reproducido
  por el reviewer** y re-ejecutado en el cierre; los cuatro en verde: `./init.sh`
  → **exit 0** (6 test files, **49/49**), `pnpm type-check` → exit 0,
  `pnpm lint` → exit 0, `pnpm build` → exit 0. Tests: 37 → **49**.
  **Control negativo ejecutado por las dos partes:** quitando solo `source('../')`
  de `main.css`, la suite del fichero da 5 fallos (`container leaked into the
  bundle: the scan widened`). CSS de producción **15.81 kB → 9.67 kB** (gzip
  4.29 → 3.19) y de **35 a 13 selectores de clase** con el extractor estricto del
  reviewer (el informe cita 56 → 15 con un contador más laxo que incluye
  artefactos `.com`/`.googleapis` del `@import` de Google Fonts: mismo hecho,
  distinto método de conteo). Que la app se ve igual no se dio por bueno con «las
  4 clases están»: el reviewer comparó los dos bundles capa por capa —`@layer
  base` **byte-idéntico** (3589 B), todo lo que hay fuera de `@layer`
  **byte-idéntico** (4967 B), ninguna variable de theme cambia de valor y no queda
  ni un `var()` roto—; solo desaparece CSS muerto. Capturas de Chromium
  antes/después con el mismo sha256.
- **Deuda técnica pendiente (NO arreglada aquí):**
  - **D1 — `bg-gray-50` sigue viajando a producción.**
    `src/__tests__/App.spec.ts:30` contiene la cadena literal en la aserción
    `expect(wrapper.classes()).not.toContain('bg-gray-50')`. Ese fichero vive
    dentro de `src/`, luego entra en la lista blanca, y Tailwind lo lee como una
    mención más: **la clase se emite al CSS precisamente porque un test afirma que
    NO se usa**. Verificado por el reviewer: **1 aparición** de `.bg-gray-50` en
    el bundle y **ningún componente la usa**; es además el único de los nombres
    examinados que aparece citado dentro de `src/`. Es una clase de la paleta por
    defecto que `docs/conventions.md` prohíbe expresamente. **No compromete ningún
    criterio de la #5** (dictamen del reviewer): el criterio 3 nombra otras cuatro
    clases y las cuatro han desaparecido, y un test **es** código de aplicación,
    así que esto es un límite legítimo del enfoque, no un defecto. No se tocó
    porque `App.spec.ts` es de la feature #4 (AGENTS.md §3: fuera de scope se
    anota, no se aplica). **Arreglos posibles y coste:**
    1. Partir el nombre en runtime como hace el spec nuevo (`probe('bg-',
       'gray-50')`) — **una línea**, mismo valor de test.
    2. Afirmar sobre las clases **presentes** en vez de sobre una ausente — una
       línea; además el test deja de depender de un nombre que ya no importa.
    3. (Del reviewer, más ambiciosa) acotar el escaneo a `src/` **excluyendo los
       `__tests__/`**: ningún test aporta clases que la app necesite, porque los
       componentes se escanean solos. Reintroduce una exclusión, así que **merece
       su propia discusión con el humano**. Las opciones 1 o 2 bastan para saldar
       D1.
  - **D2 — fragilidad conocida del test nuevo.**
    `src/assets/__tests__/tailwind-sources.spec.ts:120` lee **el primer**
    `class="…"` de `App.vue` para comprobar que sus utilidades siguen en el CSS.
    Hoy es exacto —el SFC tiene un único atributo `class`— y el
    `toBeGreaterThan(0)` impide que pase en vacío, pero se queda corto en cuanto
    el shell crezca (más de un elemento con clases) o use clases dinámicas
    (`:class`): el positivo cubriría menos de lo que aparenta. **No es un fallo
    actual, es una caducidad conocida**: ampliar el regex o dejar constancia en un
    comentario el día que `App.vue` cambie.
- **Deudas preexistentes, sin cambios:** los selectores `.com` / `.googleapis` del
  CSS no vienen del escaneo sino del `@import` remoto a Google Fonts (se irán con
  las webfonts locales, ya anotado en `docs/stack.md`); `e2e/vue.spec.ts` sigue
  siendo el scaffold; `pnpm preview` no arranca por falta de `.env.production`
  (fail-fast correcto de la #2), por eso la comprobación de navegador se hizo
  contra `pnpm dev`.
- **Cierre:** feature #5 `tailwind-source-whitelist` → **done**. Reviewer:
  **APPROVED**, sin cambios requeridos (`progress/reviews/tailwind-source-whitelist.md`);
  resumen humano en `progress/summaries/tailwind-source-whitelist.md`.
  Trazabilidad conservada en
  `progress/implementation/tailwind-source-whitelist.md` (corregida al cerrar la
  imprecisión de estado: el diff real es `pending` → `in_progress`). **Salda la
  deuda del escaneo de Tailwind anotada en la entrada de la #4**, marcada allí
  como resuelta. No quedan features `pending` ni `in_progress` en
  `feature_list.json`.

## 2026-08-03 — Mantenimiento: actualización de dependencias

> No es una feature: no entra en `feature_list.json` ni pasa por
> implementer/reviewer. El trabajo es de configuración (`package.json`,
> tsconfig, docs), no de código de aplicación.

- **Agente:** `leader` en solitario. Sin subagentes: el cambio cae en la
  excepción de `CLAUDE.md` («cambios fuera del código de aplicación»). **No se
  tocó ni un fichero de `src/` ni de `e2e/`.**
- **Plan:** `ncu` reportaba 21 paquetes desatendidos. Se subieron **por fases**,
  verificando entre cada una, para poder aislar el culpable si algo rompía:
  línea base verde → los 18 minor/patch juntos → cada major **uno a uno** →
  verificación final. Se comprobó que `./init.sh` **no cubre** lint, build ni
  e2e (solo type-check y Vitest), así que esos se lanzaron a mano.
- **Cambios:**
  - `package.json`: 20 de 21 paquetes subidos. Majors: `jsdom` 29 → **30.0.1** y
    `pinia` 3 → **4.0.2**. Minors destacados: Vite 8.2.0, ESLint 10.8.0, oxlint
    1.77.0, Tailwind 4.3.3, Vue 3.5.40, vue-router 5.2.0, Playwright 1.62.1.
  - **Nueva dependencia de runtime: `@vue/devtools-api` `^8.2.1`.** Pinia 4 la
    convierte en peer **no opcional de instalación manual**. Ningún `import` de
    `src/` la nombra, así que parece borrable y no lo es; avisado en
    `docs/stack.md`.
  - `package.json` → `engines`: `^22.18.0 || >=24.12.0` → **`^22.22.2 ||
    ^24.15.0 || >=26.0.0`**. Decisión del humano, tras detectar que jsdom 30
    exige más Node del que el proyecto declaraba soportar: se sube el suelo para
    que quien esté por debajo falle al instalar con un mensaje claro, en vez de
    reventar a mitad de los tests.
  - `vitest.config.ts` + `tsconfig.node.json`: Vite 8.2 avisa de que su futuro
    `configLoader: 'native'` no resolverá `import … from './vite.config'` sin
    extensión. Añadida la extensión `.ts` y `allowImportingTsExtensions: true`
    (seguro: ese proyecto es `noEmit`). Aviso silenciado.
  - `docs/stack.md`: versiones al día y sección nueva ***Mantenimiento de
    dependencias*** — el procedimiento por fases, por qué TS 7 no entra y las
    trampas conocidas (peers que aparecen solas, `pnpm-workspace.yaml` que crece
    solo, el e2e roto de fábrica).
- **Descartado con evidencia: TypeScript 7.** No por prudencia — se instaló y se
  probó. La **config del proyecto sí es compatible** (no usa nada de lo que la 7
  elimina: `baseUrl`, `outFile`, `target: ES5`, `moduleResolution: node10`,
  verificado con `tsc --showConfig`). Lo que lo bloquea es el tooling:
  1. **`vue-tsc` 3.3.9 ni arranca:** TS 7 reestructuró los `exports` de su
     `package.json` y vue-tsc sigue resolviendo `typescript/lib/tsc` →
     `ERR_PACKAGE_PATH_NOT_EXPORTED`. Tumba `pnpm type-check` y con él
     `pnpm build`. Fallo duro, no un aviso.
  2. **`typescript-eslint` declara peer `>=4.8.4 <6.1.0`** y sigue igual en su
     última publicada (8.66.0); entra vía `@vue/eslint-config-typescript`, así
     que no se arregla subiendo nada.

  Revertido a `~6.0.3`. **`ncu` seguirá ofreciendo la 7: es esperado.** Las dos
  condiciones para reintentarlo quedan escritas en `docs/stack.md`.
- **Verificación:** `./init.sh` verde (49 tests, 6 ficheros), `pnpm build`
  verde, `oxlint` y `eslint` sin hallazgos, `prettier --check src/` limpio,
  `pnpm peers check` sin incidencias. **El CSS de producción conserva el mismo
  hash que antes de la actualización (`index-C9zTJsPb.css`, 9.82 kB)**: ni los
  tokens ni la capa de estilos se han movido, pese a subir Tailwind.
- **Fuera de scope (anotado, NO aplicado — AGENTS.md §3):**
  - **`e2e/vue.spec.ts` lleva roto desde la feature #1**, y no lo rompió esta
    actualización: espera `<h1>You did it!</h1>` del scaffold de Vue, y `App.vue`
    solo pinta `<RouterView />` con el router en `routes: []`. Falla en chromium,
    firefox y webkit. **Nadie se entera porque `./init.sh` solo ejecuta Vitest.**
    Ya venía anotado como deuda preexistente en la entrada de la #5; sigue
    mereciendo su propia tarea (reescribirlo contra la app real o borrarlo hasta
    que haya pantalla). Al subir Playwright hay que refrescar los binarios con
    `npx playwright install`.
  - **`@types/jsdom` (^28.0.3) va por detrás de `jsdom` (30.0.1)**, pero es la
    última publicada y ningún fichero de `src/` importa tipos de jsdom: hoy no
    molesta.
- **Cierre:** mantenimiento terminado, repo verde y commiteado por el humano
  (`c703169`). `feature_list.json` **sin cambios**: sigue sin features `pending`
  ni `in_progress`.

## 2026-08-10 — Feature #6 `e2e-smoke`

> El e2e del scaffold llevaba roto desde la #1 (`<h1>You did it!</h1>` ya no lo
> pinta `App.vue`) y nadie se entera: `./init.sh` no lo ejecutaba. Además el
> build de producción no montaba (no existía `.env.production` y `VITE_API_URL`
> se quedaba fuera del bundle), así que el modo CI del e2e daba página en
> blanco. Esta feature lo convierte en una puerta de humo real ejecutada por
> `./init.sh`.

- **Agente:** implementer (flujo simple, sin `sdd`).
- **Cambios:**
  - `.env.production` (nuevo, commiteado, sin secretos): `VITE_API_URL` se
    hornea en el bundle de producción, así el build monta bajo `vite preview`
    (modo CI) **sin relajar el fail-fast** de `src/shared/config.ts`.
  - `e2e/vue.spec.ts` → **`e2e/app-boot.spec.ts`**: prueba de humo real. Verifica
    que la app monta (`#app > div` presente), que el shell aplica el fondo del
    design system (compara `background-color` computado contra el token
    `--surface-app` de `:root`) y la tipografía (`--font-sans` → Hanken
    Grotesk), y que no hay errores de consola ni `pageerror`. Las comprobaciones
    de estilos son **por valor, no por nombre de clase literal** (aprendizaje de
    la #5: una clase escrita en un fichero escaneado acaba en el CSS). El
    `readCssVar` vive dentro del `evaluate()` para no rezagarlo a Node.
  - `playwright.config.ts`: headless por defecto (`HEADED=1` para verlas, así
    `./init.sh` no abre ventanas); puerto de preview sobreescribible con
    `E2E_PREVIEW_PORT` (el 4173 cae en el rango de puertos excluidos 4151–4250
    de Windows en esta máquina, `EACCES`).
  - `init.sh`: la detección de test runner ahora soporta `test:unit` (el script
    `test` ya no existe, solo `test:unit` de Vitest); nueva sección 6 que
    ejecuta `pnpm test:e2e --project=chromium` y **degrada con aviso claro** si
    faltan los navegadores de Playwright (grep de "Executable doesn't exist")
    en vez de fallar críptico. Resumen renumerado a sección 7.
  - `docs/stack.md` (E2E por modo, puerta de `init.sh`, `.env.production`,
    cobertura de `./init.sh`, trampa obsoleta del e2e del scaffold) y
    `docs/verification.md` (Nivel 2 y bloque de tests de `init.sh`).
- **Verificación:** `pnpm test:e2e` (local, dev server 5173) → 3/3 (chromium,
  firefox, webkit) en 6.5s. Modo CI (`pnpm build` + `CI=true pnpm test:e2e`) →
  3/3 en 7.5s (con `E2E_PREVIEW_PORT=8099` por el rango excluido local). `./init.sh`
  verde con el gate chromium ejecutándose; degradación probada con
  `PLAYWRIGHT_BROWSERS_PATH` vacío → aviso claro, no falla. `pnpm type-check`,
  `pnpm lint` y `pnpm build` en verde.
- **Fuera de scope (anotado, NO aplicado):** el build con el placeholder de
  producción seguirá llevando `http://localhost:3000` hasta que el primer
  endpoint real fije la URL; el puerto 4173 bloqueado en esta máquina es un
  problema del SO, no del repo (default en CI real es correcto).
- **Cierre:** feature #6 `e2e-smoke` → **done**. `./init.sh` ahora es una puerta
  que vigila el arranque de la app a diario. No quedan features `pending` ni
  `in_progress` en `feature_list.json`.

## 2026-09-12 — Parte 3 del handoff + features 7, 8 y 9

- **Agente:** `leader` (Claude Code) orquestando `implementer`, `reviewer` y un
  agente general con el rol de `spec_author` (el tipo no estaba registrado en la
  sesión). Punto de partida: `../docs/handoff-primera-vista-frontend.md`.
- **Plan:** revisar y corregir las features 7-9 redactadas en una sesión previa
  contra el handoff y el contrato real; después implementarlas en orden 7 → 8 → 9,
  con puerta humana en cada intent y en el spec de la 9.
- **Revisión de features:** choque proxy ↔ `appConfig.apiUrl` explicitado (F7),
  tipado reducido a `GET /api/net-worth` (F7), importes como string decimal
  (F7/F9), rutas en inglés y Lucide obligatorio (F8), total leído de la API y
  partición del bloque B llevada a `decisions.md` (F9).
- **Feature 7 `api-types-and-net-worth-client` → done** (commit `0a3e9cb`).
  Tipos y `getNetWorth()` con validación en frontera en `src/features/net-worth/`;
  proxy `/api`; `VITE_API_URL=/` con base relativa en `loadConfig`. Anomalía de
  orden (cierre antes del reviewer) anotada en la bitácora de la sesión.
  Resumen: `progress/summaries/api-types-and-net-worth-client.md`.
- **Feature 8 `app-shell` → done** (commit `f3a8ebc`). Shell en
  `src/shared/components/`, cinco rutas en inglés con `meta.label`/`meta.icon`,
  `@lucide/vue` 1.45.0. Resumen: `progress/summaries/app-shell.md`.
- **Feature 9 `net-worth-view` → done** (SDD). Humano aprobó cifras es-ES,
  fechas en-GB y 🔴2–🔴6 con la propuesta. Vista de Patrimonio (bloques A, B, E
  y avisos), `src/shared/money.ts` en céntimos exactos, store de patrimonio; el
  smoke e2e responde `/api/net-worth` con una muestra (🔴6, aprobado).
  Resumen: `progress/summaries/net-worth-view.md`.
- **Verificación:** `./init.sh` verde en cada cierre; al final 16 archivos /
  158 tests unitarios, build y e2e de humo (también sin backend, en modo CI).
  Contra el backend real: `/net-worth` muestra `88.850,64 €` = `curl` `"88850.64"`.
- **Pendiente del humano / backend:** confirmar el nombre de marca
  `control·accounts`; provocar un aviso real en pantalla; en el backend, fecha del
  primer dato por producto (cabo 4) y corregir el ejemplo del contrato (cabo 5).
  No bloqueantes de los reviewers: test de clic en la sidebar, ampliar
  `tailwind-sources.spec.ts`, página 404, `./init.sh` reutiliza el dev server de
  :5173 y no detectaría una dependencia del backend.
- **Cierre:** features 1-9 `done`. Siguiente etapa del roadmap: E5 (ingesta).

## 2026-09-13 — Feature 10: dark-theme

- **Agente:** `leader` (Claude Code) orquestando `implementer` y `reviewer`.
  Flujo simple (sin SDD).
- **Plan:** el humano vio la vista de Patrimonio y pidió toda la UI en tono
  oscuro, sin fondos claros, sin perder contraste y como regla para las vistas
  futuras. Se implementa redefiniendo los tokens semánticos a nivel global, sin
  tocar componentes ni las copias del design system.
- **Cambios:** `src/assets/theme-dark.css` (tema, cargado desde
  `src/assets/main.css` después de los tokens); `src/assets/__tests__/theme-dark.spec.ts`
  (61 pares de contraste leídos del propio tema, fondos oscuros, ningún color
  crudo en `.vue`); `docs/conventions.md` (la app es solo oscura, excepción
  acotada de contraste para texto `aria-hidden` y redundante) y `docs/stack.md`.
  Ningún `.vue` modificado. Capturas antes/después en
  `progress/implementation/dark-theme/`.
- **Decisiones:** sidebar `#0B1116`, zona central y topbar `#232C36`, tarjetas
  `#141B22`; negativos a coral y enlaces/info a azul claro para llegar a 4.5:1.
  La inicial de la ficha de banco se mide a 3:1 (decorativa y redundante), no
  hay tinta de la paleta que llegue a 4.5:1 con todos los colores de gráfico.
- **Revisión:** primera ronda CHANGES_REQUESTED solo por comentarios y
  documentación de esa excepción; segunda ronda APPROVED (la primera
  re-revisión se colgó y se relanzó).
- **Verificación:** `pnpm lint`, `pnpm type-check`, `pnpm build`,
  `pnpm test:unit` (17 archivos / 249 tests) y `./init.sh` con el e2e de humo
  sin cambios, en verde.
- **Cierre:** feature 10 → **done**. Siguiente etapa del roadmap: E5 (ingesta).

## 2026-09-13 — Feature 11: app-title-and-favicon

- **Agente:** `leader` (Claude Code) orquestando `implementer` y `reviewer`.
  Flujo simple (sin SDD).
- **Plan:** título de la pestaña `Control Accounts` y favicon propio en lugar del
  de Vue, a partir del logo del design system.
- **Cambios:** `index.html` (título y enlaces a iconos); `public/` con el SVG
  verde derivado de `design-system/assets/logo-mark.svg` (aria-label en inglés),
  PNG de 32 px y `apple-touch-icon` de 180 px rasterizados con Playwright; se
  borra el `favicon.ico` de Vue; test nuevo `src/__tests__/index-html.spec.ts`.
- **Decisiones:** variante verde, porque la casi negra se pierde en pestañas
  oscuras (1,18:1); la verde queda entre 2,9:1 y 4,1:1 en las cuatro barras
  probadas. Sin `.ico` ni dependencias nuevas.
- **Verificación:** type-check, lint, 254 tests, build, `./init.sh` y e2e de humo
  contra el build en chromium, firefox y webkit, sin errores de consola por el
  404 de `/favicon.ico`.
- **Cierre:** feature 11 → **done**. El nombre de la sidebar sigue siendo
  `control·accounts` (no se pidió cambiarlo).
