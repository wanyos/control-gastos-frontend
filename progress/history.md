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

## 2026-09-14 — Feature 12: dependency-cleanup-and-upgrade

- **Agente:** `leader` (Claude Code) orquestando `implementer` y `reviewer`.
  Flujo simple (sin SDD).
- **Plan:** auditar las dependencias, quitar las que no se usan, simplificar y
  actualizar. Decisiones del humano: quitar `vite-plugin-vue-devtools`, lint solo
  con oxlint, mantener `npm-run-all2`.
- **Cambios:** de 32 a 20 dependencias. Fuera `@vue/devtools-api` (directa),
  `@types/jsdom`, `vite-plugin-vue-devtools`, `jiti` y 8 paquetes de ESLint
  (con `eslint.config.ts`, `lint:eslint` y `.eslintcache`). `.oxlintrc.json`
  ampliado (categoría `suspicious`, overrides). `tsconfig.vitest.json` declara DOM
  en `lib` (lo aportaba `@types/jsdom`). Borrado `pnpm-workspace.yaml` (solo tenía
  exclusiones obsoletas de antigüedad mínima). Todo lo demás a su última versión,
  Vitest 5 incluido sin cambios de config ni tests. Docs, `.claude/agents/` y
  `.vscode/` sin referencias a ESLint ni DevTools.
- **No actualizado:** TypeScript sigue en 6.0.3. El bloqueo no era ESLint sino
  `vue-tsc`: el leader lo reprobó el 2026-09-14 con `typescript@7.0.2` y
  `vue-tsc@3.3.11` (la última) → `ERR_PACKAGE_PATH_NOT_EXPORTED` (`./lib/tsc`),
  porque TS 7 aún no publica su API programática. `@vue/devtools-api` sigue en
  `node_modules` porque es peer obligatorio de Pinia 4 y dependencia de
  vue-router 5; no está en `package.json`.
- **Cobertura de lint perdida:** reglas de `<template>` de Vue (~56) y reglas de
  Playwright (mitigado solo en CI con `forbidOnly`). `unicorn/no-array-sort`
  desactivada por falsos positivos.
- **Verificación:** `pnpm install --frozen-lockfile`, type-check, lint, 254 tests
  con Vitest 5, build y e2e contra servidor nuevo y build. `./init.sh` salió rojo
  por un dev server viejo (12/09) en :5173 con la config antigua; el leader lo
  paró con autorización del humano y `./init.sh` quedó en verde.
- **Cierre:** feature 12 → **done**.

## 2026-09-15 — Harness: carpetas de specs con número

- **Agente:** `leader` (Claude Code).
- **Qué:** el humano pidió que las carpetas de specs lleven el id delante. La regla
  existía solo en el backend (`specs/<nn>-<name>/`, desde el 2026-09-02). Se trae
  aquí: carpetas renombradas (`02-fundamentos`, `09-net-worth-view`,
  `13-import-dialog`, `14-import-report-details`), `docs/specs.md`,
  `specs/README.md`, `AGENTS.md`, `CLAUDE.md`, `CHECKPOINTS.md`, plantillas de
  `docs/` y `.claude/agents/*` actualizados, e `init.sh` exige el nombre con número.
  Las entradas anteriores de este historial conservan las rutas antiguas.

## 2026-09-15 — Feature 13: import-dialog

- **Agente:** `leader` (Claude Code) orquestando `spec_author` (agente general con
  su rol), `implementer` y `reviewer`. Flujo SDD; plan de diseño aprobado por el
  humano (progreso por fases sin tocar backend, botón en la barra, aviso incluido).
- **Spec:** `specs/13-import-dialog/`, 15 requirements. Corrección del humano al
  🔴2: todos los bancos tienen parser y no hay PDFs, así que el aviso baja a 0
  (cabo suelto 6 del roadmap retirado).
- **Cambios:** botón Import y aviso «N new files» en `AppTopBar` (slot `actions`)
  montados desde `AppShell`; `/import` y su entrada de sidebar retiradas; feature
  `src/features/import/` (types, service con `getPendingFiles`/`runImport` y parseo
  completo del informe, store con máquina de estados, lógica pura y componentes);
  compartidos nuevos `BaseButton`, `BaseSpinner`, `BaseDialog` (accesible, no
  cerrable mientras importa), `src/shared/validation.ts` y `src/shared/banks.ts`
  (con Revolut); `ApiError.apiCode`; un 200 no JSON pasa a `ValidationError`;
  líneas `contrast:` nuevas; e2e de humo y `e2e/import-dialog.spec.ts` con toda
  `/api` simulada.
- **Revisión:** APROBADO condicionado a la prueba real (C7); antes de ella se
  corrigieron tres notas (texto libre vacío tolerado, Revolut, 200 no JSON).
- **C7 (leader, con autorización del humano):** con 0 pendientes, «You're up to
  date». Con `revolut/2025/revolut_2026-09-15.csv` devuelto desde `procesados/`:
  POST sin body ni `Content-Type` → 200 en ~5,4 s, 35 duplicados, archivo movido,
  1 conflicto de categorización en la BD (titular «with a few things to check»,
  detalle en la F14), aviso a 0 y Patrimonio recargado, sin errores de consola.
- **Verificación:** type-check, lint, 443 tests, build, e2e y `./init.sh` en verde.
- **Cierre:** feature 13 → **done**. Siguiente: F14, spec en `spec_ready`.

## 2026-09-15 — Feature 14: import-report-details

- **Agente:** `leader` (Claude Code) orquestando `spec_author` (agente general con
  su rol), `implementer` y `reviewer`. Flujo SDD; el humano aprobó las 6
  decisiones de `specs/14-import-report-details/decisions.md` sin cambios.
- **Spec:** escrito antes de implementar la F13; el implementer lo adaptó al código
  real (12 adaptaciones, ninguna contradice decisiones del humano). Acceptance
  copiado por el leader desde la sección propuesta de `requirements.md`.
- **Cambios:** debajo de «Needs attention», avisos de fallo de pasadas finales
  (siempre visibles, «Your imported movements are safe.») y cinco secciones
  plegables cerradas con recuento: descuadres (tres cifras en columna), líneas no
  leídas (máx. 5 por archivo), traspasos por emparejar y conflictos de reglas
  (máx. 10), y archivos importados con cuenta o producto nuevo. Solo lectura.
  `details.ts` y componentes nuevos en `src/features/import/components/`;
  `BaseDialog` limitado a la altura de la ventana con cuerpo con scroll. Sin
  cambios en tipos, service ni store de la F13; sin dependencias nuevas.
- **Docs:** `docs/architecture.md` lista las piezas nuevas y la segunda
  dependencia `import` → `net-worth` (`holdingTypeLabel`); roadmap E5 ✅.
- **Revisión:** APROBADO sin cambios. Notas no bloqueantes: sección con recuento
  y lista vacía si el backend violara el contrato; contorno de foco que puede
  recortarse en el borde del scroll; separadores para lector de pantalla.
- **Verificación:** type-check, lint, 529 tests, build, 4 e2e y `./init.sh` en
  verde (e2e en modo CI). Sin prueba con un informe real del backend: pendiente de
  la próxima importación real del humano.
- **Cierre:** feature 14 → **done**. E5 completa. Siguiente etapa: E6 (revisar
  antes de confirmar).

## 2026-09-20 — Feature 15: review-queue

- **Agente:** `leader` (Claude Code) orquestando `spec_author`, `implementer` y
  `reviewer`. Flujo SDD. La parte 1 del traspaso
  (`../docs/handoff-pantalla-revision.md`) la cerró el backend con su feature 47.
- **Spec:** `specs/15-review-queue/`, 14 requirements. El humano aprobó las 6
  decisiones tal cual: ruta `/review` (Movements se queda para la E7), solo
  `pending_review` sin filtro de estado, filtros y página en la URL, búsqueda con
  espera de 350 ms, 100 por página y contador en la sidebar que se oculta si su
  consulta falla.
- **Cambios:** `src/features/review/` (types, service, filters, store, lógica pura
  y componentes), compartidos nuevos `BaseInput`, `BaseSelect` y `BaseCheckbox`,
  ruta `/review` y entrada en la sidebar con contador, y dos líneas en
  `import/store.ts` para refrescar ese contador tras importar. Solo lectura: ni un
  `PATCH`. Sin dependencias nuevas.
- **Incidencia:** el implementer se cortó a mitad por un límite de uso de la API y
  se retomó desde T10 sin perder trabajo.
- **Revisión:** APROBADO condicionado a C7. Notas no bloqueantes: un `data-test`
  citado en el spec que no existe, `?q=a` de una letra que se queda en la URL sin
  buscar, y falta la línea `contrast:` del punto de color de categoría.
- **C7 (leader, con el backend real):** contador 1.607 = API, totales idénticos,
  «Page 1 of 17» con 100 filas, `cafeteria` y `CAFETERÍA` → 3 y 3, sin categoría
  1.379, filtros conservados tras recargar, cero escrituras y cero errores de
  consola.
- **Verificación:** type-check, lint, 691 tests (51 ficheros), build, 8 e2e y
  `./init.sh` en verde.
- **Cierre:** feature 15 → **done**. Siguiente: F16 `review-actions`.

## 2026-09-22 — Features 16 y 17: review-actions y category-rules

- **Agente:** `leader` (Claude Code) orquestando `implementer` y `reviewer` (la F17
  además con `spec_author`). Flujo SDD en las dos.
- **F16 `review-actions`** (implementada el 2026-09-20, cerrada hoy): categorizar y
  confirmar desde `/review`, uno a uno y en bloque hasta la página entera, con
  `Undo` de la última acción. Primera pantalla de la web que escribe en la base de
  datos. Aprobada por el reviewer sin cambios.
- **T21, prueba contra el backend real** (con el visto bueno del humano): sobre el
  movimiento 42368 (IBERDROLA, 96,29 €, pendiente, Suministros), pulsando en la
  interfaz. Categorizar a Vivienda → `Undo` → vuelve a Suministros; `Confirm` → sale
  de la cola y el contador baja de 1.607 a 1.606 → `Undo` → vuelve a pendiente y a
  1.607. Antes y después idénticos salvo `updatedAt`; cuatro `PATCH` con solo
  `ids`/`categoryId`/`status`; cero errores de consola.
- **Commit único para F15 y F16** (`f427175`): la F16 amplió sin commitear los
  mismos archivos que creó la F15, así que un commit «solo F15» no habría
  correspondido a ningún estado compilado y probado. Queda explicado en el mensaje.
- **F17 `category-rules`** (alta, spec y cierre el mismo día): crear una regla desde
  una fila de Review, pantalla propia `Rules` para verlas, cambiarlas y borrarlas, y
  aplicarlas bajo demanda viendo cuántos se categorizaron, cuántos no casan y qué
  movimientos chocan. El humano aprobó las 6 decisiones tal cual: pantalla propia,
  texto propuesto por la primera palabra con sentido, aplicar como gesto aparte y
  con confirmación previa, no categorizar el movimiento de origen y enseñar todos
  los conflictos. Aprobada por el reviewer sin cambios.
- **T22, prueba contra el backend real** (con el visto bueno del humano, que eligió
  «aplicar y dejar lo que salga»): regla `tulotero` → Ocio creada desde Review y
  aplicada desde el aviso. La pantalla dijo «5 movements categorized · 1372 still
  without a matching rule · 1 conflict» y la API confirmó esos mismos cinco ids
  (21750, 33099, 33260, 33371, 42521). Solo dos escrituras: `POST
  /api/category-rules` y `POST /api/category-rules/apply` sin cuerpo.
- **Dos cosas que salieron de esa prueba y se corrigieron después:** el texto
  propuesto podía quedar demasiado corto (`mega` casaba también con «ACADEMIA OMEGA
  SL»; ahora crece hasta `MIN_PROPOSAL_LENGTH`), y el `data-test` de `BaseDialog` se
  perdía en la raíz `Teleport`, lo que dejaba pasando siempre un test de
  `RulesView.spec.ts`; ahora se traslada al panel y el test prueba las dos caras.
- **Rastro en los datos reales:** 63 reglas (nuevas `mega deportes` → Salud y deporte
  y `tulotero` → Ocio) y seis movimientos categorizados; 1.373 pendientes sin
  categoría.
- **Verificación:** type-check, lint, 905 tests (64 ficheros), build, 16 e2e y
  `./init.sh` en verde, ejecutado por el leader al final.
- **Cierre:** features 16 y 17 → **done**. E6 completa. Siguiente etapa: E7 (el
  extracto).

## 2026-09-24 — Feature 18: rule-match-preview

- **Agente:** `leader` (Claude Code) orquestando `spec_author`, `implementer` y
  `reviewer`. Flujo SDD. Salió de la prueba real de la F17: `mega` casaba también
  con «ACADEMIA OMEGA SL» y no había forma de verlo antes de aplicar.
- **Spec:** `specs/18-rule-match-preview/`, 15 requisitos. El humano aprobó las 5
  decisiones tal cual: aviso por encima de 50 movimientos sin bloquear el guardado,
  5 ejemplos recientes dentro del diálogo, 350 ms desde la última tecla, propuesta
  de texto que crece ante palabras genéricas y salta las de canal, y fallo del
  recuento que avisa y deja guardar igual. Sus dos respuestas previas: el recuento
  cuenta solo pendientes sin categoría, y los ejemplos se ven en el propio diálogo.
- **Cambios:** previsualización en el diálogo de la regla (recuento y ejemplos) con
  una sola lectura de `GET /api/movements` por texto —pendiente, sin categoría y del
  tipo del movimiento—, `src/shared/movements.ts` con la lectura que ahora comparten
  Review y las reglas, y mejora de `proposeMatchText`. Solo lectura: ni una
  escritura en todo el camino. Sin dependencias nuevas.
- **Revisión:** APROBADO sin cambios. El reviewer repitió la puerta entera y validó
  que nada escribe, que la consulta es la del spec, que la tabla de propuestas está
  fijada en tests y que la desviación declarada (medir por método en vez de por
  ruta, porque ahora el diálogo lee movimientos) no debilita lo que protegía.
- **T18, comprobación con el humano delante** (solo lectura): 14 conceptos reales en
  el diálogo. Lo que dice la pantalla coincide con la API en los 14; el filtro por
  tipo explica que `juan jose romero` dé 40 como ingreso y 8 como gasto. El aviso
  salta donde debía (`servicios selecta` → 355). Los ceros de `tulotero`,
  `mega deportes` e `iberdrola` son correctos: ya están categorizados. Cero
  escrituras y cero errores de consola.
- **Deuda que el humano deja para más adelante:** la propuesta arrastra papeleo y
  puntuación en «ANUL. /VivaGym» (`anul. /vivagym` en vez de `vivagym`) y sigue floja
  con nombres de canal («TRANS INM/ N26» → `trans inm`, que pesca también Openbank;
  «TPV VIRTUAL» → `tpv virtual`). El texto es editable y el recuento avisa, así que
  no rompe nada.
- **Verificación:** type-check, lint, 973 tests (67 ficheros), build, 17 e2e y
  `./init.sh` en verde.
- **Cierre:** feature 18 → **done**. Siguiente etapa: E7 (el extracto).

## 2026-09-26 — Feature 19: statement-by-month (y el encargo de las sumas honestas)

- **Agente:** `leader` (Claude Code) orquestando dos exploraciones en paralelo,
  `spec_author`, `implementer` y `reviewer`. Flujo SDD. Primera feature de la E7.
- **Antes del spec, dos exploraciones de solo lectura** (`progress/exploration/`),
  porque el humano pidió revisar el ruido que iba a ensuciar también los dashboards:
  - `ruido-traspasos-backend.md`: los `totals` del backend **ya excluyen** los
    movimientos con `transferId`, los `neutral` y los que tengan `productId`
    (`computeTotals`, `movements.service.ts:456-471`), y `GET /api/overview` usa esa
    misma función. Pero **`productId` no tiene escritor** y los únicos campos
    escribibles de un movimiento son `categoryId` y `status`: no hay forma de marcar
    «esto no cuenta» desde el frontend.
  - `ruido-traspasos-datos.md`: los 29 apuntes de depósito de myinvestor valen
    285.000 € de gasto y 275.652 € de ingreso, el 58 % de la base; 17 traspasos
    propios quedaron sin emparejar y 16 no tienen espejo importado; y **2 de las 40
    parejas detectadas son falsas** (dos multas casadas con Bizums de otra persona
    que le devolvía su parte), hoy fuera de las sumas sin motivo.
- **Encargo al backend:** `../docs/handoff-sumas-honestas.md`, con tres piezas
  (marcar un movimiento como que no cuenta, poder corregir emparejamientos y no perder
  los dudosos, y un filtro por traspaso) y una 🔴 para el humano: el vencimiento de un
  depósito trae principal e intereses juntos, así que excluirlo entero pierde ~900 €
  de ingreso real.
- **Spec:** `specs/19-statement-by-month/`, 15 requisitos. El humano aprobó las 6
  decisiones tal cual: flechas más selector de mes, sumas con etiquetas `Money in` /
  `Money out` / `Difference` y **nota permanente, sin botón de cerrar**, sobre por qué
  están infladas, lista continua con cabecera por día, un mes en una sola petición de
  200 con `Load more` de reserva, marca `Transfer` en los emparejados (se ven pero no
  suman) y el mes solo en la URL.
- **Cambios:** `src/features/statement/` (vista, store, componentes y lógica pura de
  meses), `/movements` deja de ser placeholder. Solo lectura: ni una escritura.
- **Revisión:** APROBADO sin cambios. El reviewer repitió la puerta, verificó que la
  nota no se puede cerrar ni esconder y que su texto coincide palabra por palabra con
  el diseño, que las cifras se pintan tal cual llegan (hay test que falla si alguien
  las sustituye por una suma local), y aceptó una a una las 7 desviaciones declaradas.
- **T18, comprobación con el humano delante** (solo lectura): seis meses contra la API
  —2026-09, 2026-07, 2026-03, 2025-12, 2024-01 y 2023-05, este vacío— con las tres
  cifras y el número de movimientos **coincidiendo al céntimo** en los seis. Mes vacío
  con su mensaje, `Next` apagado en el mes en curso, `2026-13` cayendo al mes actual y
  11 marcas `Transfer` que son los 11 `transferId` de la API. Cero escrituras.
- **Verificación:** type-check, lint, 1.060 tests (74 ficheros), build, 21 e2e y
  `./init.sh` en verde.
- **Cierre:** feature 19 → **done**. E7 a medias: quedan filtros y búsqueda, el
  interruptor del ruido (depende de la parte 1 del handoff) y corregir categorías
  desde el extracto.

## 2026-09-27 — Feature 20: statement-filters

- **Agente:** `leader` (Claude Code) orquestando `spec_author`, `implementer` y
  `reviewer`. Flujo SDD. Segunda rodaja de la E7.
- **Decisión de producto previa del humano:** los filtros **afinan el mes**; se
  conserva la navegación por meses y el rango libre de fechas no entra (se le
  ofrecieron las tres opciones con maqueta).
- **Spec:** `specs/20-statement-filters/`, 15 requisitos. El humano aprobó las 5
  decisiones tal cual: la barra de la cola de revisión se **parte** (la lógica pura a
  `src/shared/movement-filters.ts`, que `review/filters.ts` re-exporta; el componente
  se copia con cuatro controles: búsqueda, cuenta, categoría y sin categoría), línea de
  alcance con el recuento del propio filtro sin pedir el mes sin filtrar, mes y filtros
  en la URL con las claves de la cola, desplegables completos con `GET /api/accounts` y
  `GET /api/categories`, y «sin categoría» apagado al entrar.
- **La combinación que el contrato rechaza** (`categoryId` junto a `uncategorized`) se
  corrige en el cliente antes de que salga la petición: el 400 no puede verse.
- **Revisión:** APROBADO sin cambios. El reviewer comprobó con `git diff` que **ningún
  test de las features 15 a 18 cambió**, que la lógica mudada es idéntica carácter a
  carácter, y que las dos desviaciones sobre tests existentes **refuerzan** lo que
  protegían (el conjunto exacto de paths en vez de un `every`, y el test antifiltración
  de mensajes ampliado a 8 combinaciones).
- **T17, comprobación con el humano delante** (solo lectura): 8 combinaciones contra la
  API real —mes entero, una cuenta, la de inversión, una categoría, sin categoría,
  búsqueda, cuenta + sin categoría y búsqueda sin resultados—, con las cifras y el
  recuento cuadrando en las 8. La URL imposible manda una sola petición sin
  `categoryId` y sin error visible. Cero escrituras y cero errores de consola.
- **Hallazgo de producto:** julio de 2026 en n26 son **221,45 € de entrada y 1.038,07 €
  de salida**, frente a los 57.948 € y 59.096 € del mes entero; filtrando por
  myinvestor salen 55.169 € y 55.357 €, que es el depósito rodando. Hasta que llegue la
  marca del backend (parte 1 de `../docs/handoff-sumas-honestas.md`), **filtrar por
  cuenta es la única forma de ver el gasto real**.
- **Verificación:** type-check, lint, 1.135 tests (78 ficheros), build, 23 e2e y
  `./init.sh` en verde. Se instalaron los binarios de Playwright que faltaban en la
  máquina (no es dependencia nueva).
- **Cierre:** feature 20 → **done**. E7 sigue 🟡: quedan el interruptor del ruido
  (depende del backend) y corregir categorías desde el extracto.

## 2026-09-27 — Feature 21: statement-fix-category

- **Agente:** `leader` (Claude Code) orquestando `spec_author`, `implementer` y
  `reviewer`. Flujo SDD. Tercera rodaja de la E7 y **la primera vez que el extracto
  escribe**. Se eligió esta feature porque era la única de la etapa que no dependía de
  la sesión del backend, que estaba con su parte del handoff.
- **Intención del humano** a partir de un borrador razonado (`docs/intent-f21-draft.md`,
  ya borrado), con sus cuatro respuestas: solo la categoría (el estado no se toca), de
  uno en uno, sí crear reglas desde el extracto, y la línea desaparece al momento si el
  cambio la deja fuera del filtro.
- **Spec:** `specs/21-statement-fix-category/`, 17 requisitos (dos por encima del tope
  blando, con el motivo escrito). El humano aprobó las 5 decisiones tal cual: selector
  **escondido** (la etiqueta de categoría de la línea se vuelve editor en su sitio, una
  línea a la vez, para no convertir el extracto en otra cola), `Create rule` colgando de
  ese editor y **sin** categorizar el movimiento de origen (coherente con la F17), la
  línea desaparece también filtrando por una categoría concreta, deshacer sin cuenta
  atrás, y las cifras solo se repiden si hay filtro de categoría puesto.
- **La protección clave:** el cuerpo del PATCH se construye en un único sitio y lleva
  **solo `categoryId`**. La pantalla enseña también movimientos confirmados, así que un
  `status` colado los habría devuelto a pendiente en silencio.
- **Revisión:** APROBADO sin cambios. El reviewer verificó las dos barreras del cuerpo,
  que el e2e lo ejercita sobre un movimiento **confirmado**, y que el origen de jsdom
  coincide con el del backend real (de ahí que importe tanto que todo esté mockeado).
  Aceptó las 6 desviaciones, incluida la T3 que el implementer decidió no hacer.
- **T22, prueba contra el backend real** con visto bueno explícito del humano
  («cambiar y deshacer»): movimiento 32428 (RECIB /IBERDROLA, 53,18 €, 24 de marzo,
  Suministros). El editor ofreció 14 categorías, todas de gasto; cambio a Vivienda y
  deshacer devolvió Suministros. Dos PATCH, los dos con solo `categoryId`. Antes y
  después idénticos salvo `updatedAt`. Cero errores de consola.
- **Hallazgo de la prueba:** el backend **ya entregó su feature 49**. Las respuestas
  traen `excludedFromTotals` y el contrato documenta los filtros `transfer=only|none` y
  `excluded=only|none`, además de poder escribir esa marca en los dos PATCH. La parte 2
  del handoff (el interruptor del ruido) **queda desbloqueada**.
- **Verificación:** type-check, lint, 1.212 tests (82 ficheros), build, 28 e2e y
  `./init.sh` en verde.
- **Cierre:** feature 21 → **done**. De la E7 queda solo el interruptor del ruido, que
  ya es posible.
