# Informe de implementación — #5 `tailwind-source-whitelist`

- **Feature:** #5 `tailwind-source-whitelist` — Acotar a lista blanca los ficheros
  que Tailwind escanea
- **Tipo:** sin `sdd` → se trabaja del `intent` + `acceptance` de `feature_list.json`
- **Fecha:** 2026-07-20 (sesión previa bloqueada el mismo día; reanudada y completada)
- **Agente:** implementer
- **Estado final en `feature_list.json`:** `in_progress` — **no se marca `done`**,
  pendiente del veredicto del `reviewer` y de que exista
  `progress/summaries/tailwind-source-whitelist.md`

---

## Antecedente (bloqueo, ya resuelto)

Una primera sesión paró en la línea base sin tocar código: `./init.sh` daba
**exit 1** porque abría `feature_list.json` sin `encoding` explícito y en este
Windows Python usa `cp1252`, que no sabe decodificar el byte `0x8d` de la `Í` de
«SÍ» del propio `acceptance` de esta feature. El leader lo corrigió en el commit
**`03a92c9`** (`encoding="utf-8"`). Línea base reconfirmada al reanudar:
**exit 0**, 5 test files, **37/37** tests. Nada del diagnóstico afectaba a esta
feature; el plan siguió siendo válido tal cual.

> **Precisión sobre el estado (corregida tras la revisión).** La sesión previa
> quedó `blocked`, pero el mismo commit `03a92c9` del leader devolvió la feature
> a `pending`. Por tanto el diff real de `feature_list.json` en esta sesión es
> **`pending` → `in_progress`**, no `blocked` → `in_progress`.

---

## Resumen

Tailwind v4 decide qué CSS emite **leyendo ficheros como texto plano** y
extrayendo lo que parezca un nombre de clase. Partía del directorio de trabajo,
o sea del repo entero: `docs/`, `progress/` y `feature_list.json` citan nombres
de utilidades al explicar cosas, y Tailwind los tomaba por usados.

El escaneo pasa a **lista blanca**: `source('../')` en el `@import` reancla la
base a `src/`, más `index.html` declarado aparte. Ninguna dependencia nueva,
ningún token ni entrada de `@theme inline` tocados, cero cambios visuales.

**CSS de producción: 15.76 kB → 9.67 kB** (gzip 4.27 → 3.19), de **56 a 15**
selectores de clase.

---

## Archivos creados

| Archivo | Qué es |
|---|---|
| `src/assets/__tests__/tailwind-sources.spec.ts` | 12 tests que compilan el bundle real y aseveran el efecto del acotado |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/assets/main.css` | `source('../')` en el `@import`; fuera `@source not '../../design-system'`; dentro `@source '../../index.html'` |
| `docs/stack.md` | nueva sección *Qué ficheros escanea Tailwind (lista blanca)*; nota 4 reescrita; puntero desde *Librerías clave* |
| `feature_list.json` | `pending` → `in_progress` |
| `progress/current.md` | plan y bitácora |

**No tocados** (fuera de alcance, criterio 8): tokens, `@theme inline`,
`App.vue`, `design-system/`, `init.sh`.

---

## 1. El cambio en `main.css` y su mecánica

```css
/* antes */
@import 'tailwindcss';
@source not '../../design-system';

/* ahora — main.css:15 y main.css:20 */
@import 'tailwindcss' source('../');
@source '../../index.html';
```

**Cómo funciona `source()`.** No es un filtro: **reancla la base** de la
detección automática, que por defecto es el directorio de trabajo. `main.css`
vive en `src/assets/`, así que `'../'` resuelve a **`src/`** (verificado con el
resultado real, no por lectura: tras el cambio siguen emitiéndose las clases de
`src/App.vue` y desaparecen las de `docs/`). Dentro de esa base la detección
automática mantiene sus reglas de siempre — respeta `.gitignore`, salta binarios.

**Por qué lista blanca y no más exclusiones.** Es literalmente el `por_que` del
`intent`: ir excluyendo carpetas es un juego de topos que solo tapa lo ya
descubierto, mientras la contaminación crece sola (`progress/history.md` no se
poda nunca). Invertirlo tiene tres efectos: escribir documentación deja de
cambiar lo que se compila; el bundle vuelve a ser fiable para saber qué está
vivo; y **`@source not '../../design-system'` sobra**, porque esa carpeta está
en la raíz y ya no entra por definición (criterio 2).

---

## 2. Las dos decisiones delegadas por el humano

### 2a. La forma del test

**Decisión: un fichero nuevo, `src/assets/__tests__/tailwind-sources.spec.ts`,
que compila el bundle de producción real y asevera sobre su CSS.**

**Por qué no un grep de la configuración.** Un test que buscara `source('../')`
en `main.css` verifica que alguien escribió una cadena, no que el escaneo esté
acotado. Seguiría en verde si el escaneo se ensanchara por otra vía (un `@source`
nuevo, un cambio de base, un plugin), que es exactamente el fallo silencioso
contra el que esta feature existe. El test asevera el **efecto**.

**Cómo compila.** Vía la API de Vite con la config real del proyecto:
`build({ root, logLevel: 'silent', build: { write: false } })`, y se leen los
assets `.css` del `RollupOutput` en memoria. Se usa el pipeline que de verdad se
publica, sin escribir a disco ni ensuciar `dist/`.

> Detalle de implementación: `build()` devuelve `RollupOutput` **suelto**, no un
> array, cuando hay un solo environment. Se normaliza con `[result].flat()`.
> El fichero declara `@vitest-environment node` (el global es `jsdom`).

**Coste en tiempo — medido, no estimado.** El fichero tarda **~0.9-1.0 s** y la
suite **completa** pasa de 1.64 s a **1.68 s** (49 tests). El build de esta app
es de ~130 ms; el resto es arranque de Vite. A este coste no compensaba buscar
alternativas más frágiles (invocar la API interna de `tailwindcss` +
`@tailwindcss/oxide` obligaría a reimplementar el escaneo a mano contra
internals no documentados, y dejaría de probar lo que se publica).
**Si algún día crece y molesta**, el corte natural es marcarlo como suite lenta,
no bajar el nivel de la aserción.

**Por qué los nombres de clase se parten con `probe()`.** Es el hallazgo más
importante de la sesión y no es un capricho de estilo:

```ts
const probe = (...parts: string[]) => parts.join('')
const CONTAMINANTS = [probe('bg-', 'chart-3'), probe('text-', 'red-500'), probe('cont', 'ainer'), …]
```

El spec vive en `src/`, que ahora **sí** se escanea entero. Escrito literalmente,
`'bg-chart-3'` haría que Tailwind lo emitiera **desde el propio test**, y la
aserción «no está en el bundle» **nunca podría fallar**: un test verde para
siempre, que es peor que no tener test. Partiendo el nombre, ningún trozo
(`'bg-'`, `'chart-3'`) es una utilidad válida y no se emite nada.

Esto no es teórico: está **confirmado en este repo**. `src/__tests__/App.spec.ts:30`
contiene `'bg-gray-50'` literal, y `.bg-gray-50` **sigue apareciendo en el CSS de
producción** por esa única razón (ver *Deuda detectada*). Verificado además que
añadir el nuevo spec **no cambia el bundle**: mismo hash (`index-DWXM5jDg.css`),
mismos 9.67 kB, misma lista de 15 selectores antes y después de crearlo.

**Por qué los tests de vacuidad («%s is still a meaningful probe»).** Un probe
solo demuestra algo mientras se cumplan **dos** condiciones: que siga citado
**fuera** de `src/` y que **no** se use **dentro**. Si mañana alguien reescribe
`docs/stack.md` y quita la mención a `bg-chart-3`, la aserción «no está en el
bundle» pasaría a ser trivialmente cierta y el test seguiría verde **sin probar
nada**. Por eso cada probe se valida antes de usarse, con mensajes que dicen qué
hacer (`nothing outside src/ quotes X any more; replace this probe`). El test se
autovigila: falla ruidosamente en vez de degradarse en silencio.

> Las menciones se buscan con frontera de palabra `(?<![\w-])X(?![\w-])`, para
> que `--container-max` de `tokens/spacing.css` no cuente como uso de la utilidad
> `container`. Y la presencia en CSS con `\.X(?![\w-])`, para que `.text-ink-body`
> no se lea como `.text-ink`.

**El lado positivo (criterio 4) no lleva literales tampoco:** las clases se leen
del atributo `class` de `src/App.vue` en tiempo de ejecución. Así el test sigue a
la app: si mañana `App.vue` usa otras utilidades, se exigen esas, sin editar el
test y sin poder pasar vacío (`expect(used.length).toBeGreaterThan(0)`).

**Por qué fichero aparte y no extender `styles.spec.ts`.** `styles.spec.ts` es
rápido y puro (lee ficheros y compara tokens); este arranca un build. Concerns
distintos y perfiles de coste distintos: separados, la suite rápida sigue siendo
rápida y la lenta es identificable de un vistazo.

**Control negativo ejecutado.** Se quitó `source('../')` de `main.css` y se
relanzó la suite: **los 5 probes fallan** (`container leaked into the bundle: the
scan widened`). El test detecta de verdad el ensanchamiento; no es un test que
pase por construcción. `main.css` quedó restaurado.

### 2b. Qué hacer con `index.html`

**Decisión: declararlo explícitamente** — `@source '../../index.html'` — en vez
de solo documentarlo.

**Verificado con evidencia, no razonado en abstracto.** Se puso una clase de
prueba en `<body>` y se compiló, dos veces:

| Configuración | Clase de `index.html` en el CSS |
|---|---|
| `source('../')` **sin** `@source '../../index.html'` | **no** (desaparece, sin ningún error de build) |
| `source('../')` **con** `@source '../../index.html'` | **sí** |

`index.html` quedó restaurado tras la prueba (`git diff` limpio).

**Por qué declararlo:**

1. **Es código de aplicación.** Es el shell de la app; el criterio no es «está en
   `src/`» sino «lo escribo yo y se publica». La lista blanca honesta es
   `src/` + `index.html`.
2. **El fallo que evita es silencioso.** Sin la línea, añadir `class="h-full"` al
   `<html>` no da error: simplemente no se aplica el estilo, y el rato que se
   pierde buscando el porqué es exactamente la clase de acoplamiento invisible
   entre texto y build que esta feature viene a eliminar.
3. **No reabre el juego de topos.** Lo que el `intent` rechaza son *exclusiones*
   reactivas, descubiertas de una en una y siempre incompletas. Esto es una
   *inclusión* declarativa, de un fichero fijo y conocido, decidida por
   adelantado. Es la misma frase de siempre —«aquí vive mi código»— dicha entera.

**Coste:** una línea y un comentario. **Riesgo:** ninguno; un `@source` explícito
ignora `.gitignore`, pero apunta a un único fichero HTML propio, sin capacidad de
contaminar. Queda además documentado en `docs/stack.md` como la trampa práctica
del nuevo enfoque (o sea: se hicieron **las dos** cosas, declararlo y contarlo).

---

## 3. Los 8 criterios de `acceptance`, uno a uno

| # | Criterio | Evidencia |
|---|---|---|
| 1 | `main.css` acota el escaneo con `source()` en el `@import` | `src/assets/main.css:15` → `@import 'tailwindcss' source('../');` (+ comentario del porqué en 10-14). `main.css` está en `src/assets/`, luego `'../'` = `src/` |
| 2 | Se elimina `@source not '../../design-system'` | Borrada la línea y su comentario. Es redundante: `design-system/` está en la raíz, fuera de la base `src/`. Verificado por efecto: ninguna utilidad procedente de esa carpeta aparece en el bundle |
| 3 | El CSS NO contiene `.bg-chart-3`, `.fill-chart-3`, `.text-red-500` ni `.container` | 0 apariciones en `dist/assets/index-DWXM5jDg.css`. La lista de selectores baja de 56 a 15; también caen `.shadow-brand`, `.bg-negative-subtle`, `.bg-brand`, `.gap-6`, `.p-4`, `.flex`, `.grid`, `.rounded-*`, `.text-gray-900`… Automatizado en `tailwind-sources.spec.ts` (`does not ship %s`) |
| 4 | El CSS SÍ contiene lo que usa `App.vue` y la app se ve igual | `.min-h-screen`, `.bg-surface-app`, `.text-ink-body`, `.antialiased` presentes. Automatizado (`still ships every utility App.vue uses`, leyendo las clases de `App.vue`). Comprobación en navegador: ver §5 |
| 5 | Existe un test que falla si el escaneo vuelve a abarcar ficheros que no son código de aplicación | `src/assets/__tests__/tailwind-sources.spec.ts`, 12 tests. **Control negativo ejecutado**: sin `source('../')`, 5 fallos |
| 6 | `docs/stack.md` documenta la lista blanca, el porqué y la consecuencia práctica | Nueva sección *Qué ficheros escanea Tailwind (lista blanca)*: mecánica de `source()`, por qué lista blanca y no exclusiones, la trampa de los ficheros fuera de `src/` (con `index.html` como caso), y el test que lo vigila. Nota 4 de *por qué `main.css` está montado así* reescrita para no dejar el `@source not` colgando |
| 7 | `pnpm build`, `pnpm type-check`, `pnpm lint` y `./init.sh` en verde | Ver §4 |
| 8 | No cambia ningún token ni ninguna entrada de `@theme inline` | El diff de `main.css` toca **solo** las líneas 10-20 (bloque del `@import`). El bloque `@theme inline` y `src/assets/styles/**` están intactos; `styles.spec.ts` (10 tests que vigilan la copia literal de tokens) sigue verde |

---

## 4. Gate y medición

| Comando | Resultado |
|---|---|
| `./init.sh` | **exit 0** — 6 test files, **49/49** tests |
| `pnpm type-check` | **exit 0** (`vue-tsc --build`, sin errores) |
| `pnpm lint` | **exit 0** (`oxlint` + `eslint`, sin warnings; `prettier --check` limpio en los ficheros nuevos/tocados) |
| `pnpm build` | **exit 0** |

```
── 5. Ejecutando tests ─────────────────────────────────
 Test Files  6 passed (6)
      Tests  49 passed (49)
   Duration  1.68s
[OK]    Todos los tests pasan

── 6. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Medición antes / después:**

| | Antes | Después |
|---|---|---|
| CSS de producción | `index-DkEZ2Yoc.css` **15.76 kB** | `index-DWXM5jDg.css` **9.67 kB** |
| gzip | 4.27 kB | 3.19 kB |
| Selectores de clase | **56** | **15** |
| JS | 87.22 kB | 87.22 kB (sin cambio) |

Los 15 que quedan: las 4 utilidades de `App.vue`; `.cc-focusable`, `.cc-mono`,
`.cc-negative`, `.cc-num`, `.cc-overline`, `.cc-positive`, `.cc-ring` (clases
**propias** de `tokens/base.css`, no utilidades generadas); `.com` y
`.googleapis` (artefactos de parseo del `@import` remoto de Google Fonts);
`.inline` (de la cadena `@theme inline` citada en `styles.spec.ts`); y
`.bg-gray-50` (ver deuda D1).

> El peso no era el objetivo declarado por el humano —lo dice el `intent`— pero
> se reporta por pedido explícito. El resultado buscado es el de arriba a la
> derecha: **15 selectores, todos explicables**.

---

## 5. Verificación en navegador — **hecha**

Playwright + Chromium contra `pnpm dev` (1280×800), capturando estilos
computados, fuentes y captura de pantalla. Se midió **después**, luego se
restauró `main.css` a la versión de HEAD para medir **antes** con el mismo
script, y se restauró de nuevo.

| Observado | Antes | Después |
|---|---|---|
| `body` background | `rgb(247, 249, 251)` | `rgb(247, 249, 251)` |
| `--surface-app` | `#F7F9FB` | `#F7F9FB` |
| `body` color | `rgb(56, 67, 79)` | `rgb(56, 67, 79)` |
| `--ink-body` | `#38434F` | `#38434F` |
| `body` font-family | `"Hanken Grotesk", system-ui, …` | idéntico |
| `body` font-size | `14px` | `14px` |
| `-webkit-font-smoothing` | `antialiased` | `antialiased` |
| Clases del shell | `min-h-screen bg-surface-app text-ink-body antialiased` | idénticas |
| Shell background / color / min-height | `rgb(247,249,251)` / `rgb(56,67,79)` / `800px` | idénticos |
| Webfonts declaradas | Hanken Grotesk, JetBrains Mono, Schibsted Grotesk (3/3) | idénticas |
| Petición a Google Fonts | `200` | `200` |

**Capturas de pantalla byte-idénticas** (mismo sha256, 6633 bytes). La página
sale vacía sobre el fondo `#F7F9FB` porque el router aún no tiene rutas
(`routes: []`), que es el estado esperado hoy. **Criterio 4 cumplido: cero
cambios visuales.**

---

## 6. Deuda detectada y sugerencias fuera de scope (anotadas, NO aplicadas)

- **D1 — `src/__tests__/App.spec.ts:30` contamina el bundle.** La línea
  `expect(wrapper.classes()).not.toContain('bg-gray-50')` escribe el nombre
  literal, y como está en `src/` (dentro de la lista blanca) Tailwind lo emite:
  `.bg-gray-50` sigue en el CSS de producción. Es una clase de la paleta por
  defecto que `docs/conventions.md` **prohíbe expresamente**. Es un fichero de
  otra feature (#4), así que **no lo he tocado**. Arreglo sugerido: partir el
  nombre igual que en el nuevo spec, o afirmar sobre las clases presentes en vez
  de sobre una ausente. Coste: una línea.
  **Nota:** no contradice ningún criterio de esta feature —el 3 nombra otras
  cuatro clases y las cuatro han desaparecido— pero sí es el mismo patrón, ahora
  dentro de la frontera.
- **D2 — Los artefactos `.com` / `.googleapis`.** Salen del `@import` remoto de
  `fonts.css`, no del escaneo, así que esta feature no los toca. Desaparecerían
  con las webfonts locales, que ya es deuda conocida en `docs/stack.md`.
- **D3 — Deudas preexistentes, sin cambios:** `e2e/vue.spec.ts` sigue siendo el
  scaffold; `pnpm preview` no arranca porque no hay `.env.production` y
  `config.ts` exige `VITE_API_URL` (por eso la comprobación de navegador se hizo
  contra `pnpm dev`); webfonts por CDN.

---

## 7. Estado final

- `feature_list.json` → feature #5 en **`in_progress`**.
- **No se ha marcado `done`** y **no se ha hecho ningún commit**, según el
  protocolo: falta el veredicto del `reviewer` y
  `progress/summaries/tailwind-source-whitelist.md`.
- Árbol de trabajo (`git status --porcelain`), sin temporales:

  ```
   M docs/stack.md
   M feature_list.json
   M progress/current.md
   M src/assets/main.css
  ?? progress/implementation/tailwind-source-whitelist.md
  ?? src/assets/__tests__/tailwind-sources.spec.ts
  ```
