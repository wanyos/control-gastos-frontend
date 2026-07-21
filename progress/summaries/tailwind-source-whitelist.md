# Resumen — feature 5 `tailwind-source-whitelist`

Fecha de cierre: 2026-07-21
Intención original: `feature_list.json` → feature `tailwind-source-whitelist`, bloque `intent`
Spec (si SDD): no aplica (feature de flujo simple, sin spec)

## Qué hace ahora la app que antes no

Tailwind ya **solo mira tu código** para decidir qué CSS genera. Antes leía el
repositorio entero como texto plano —`docs/`, `progress/`, `feature_list.json`,
la carpeta del design system— y cada vez que uno de esos documentos nombraba una
clase al explicar algo, Tailwind se lo creía y la metía en el CSS de producción.
Por eso el bundle llevaba `.bg-chart-3`, `.fill-chart-3`, `.text-red-500`,
`.container` y una veintena más que ninguna pantalla usa.

Ahora la base del escaneo es `src/`, más `index.html` declarado a mano. Las
consecuencias prácticas, que son lo que pedías:

1. **Escribir documentación ya no cambia lo que se compila.** Puedes llenar
   `docs/` y `progress/` de nombres de clases sin tocar el CSS.
2. **El bundle vuelve a ser fiable para saber qué está vivo.** Si borras una
   clase del código, desaparece del CSS aunque un informe viejo la nombre.
3. Se acabó el juego de topos: la exclusión que se había parcheado a mano para
   `design-system/` **se ha borrado**, porque esa carpeta ya no entra por
   definición.

De propina, aunque no era el objetivo: el CSS pasa de **15.81 kB a 9.67 kB**
(gzip 4.29 → 3.19) y de 35 a 13 selectores de clase, todos explicables. Visualmente
la app **no cambia nada**: verificado comparando los dos CSS compilados capa por
capa (la capa base y los tokens salen byte a byte idénticos) y con capturas de
pantalla del navegador con el mismo sha256.

## Por dónde se usa (puntos de entrada)

Esto no es una pantalla, es una regla del build. Se toca en tres momentos:

- **Al maquetar:** nada cambia. Escribes clases en los `.vue` de `src/` y salen.
- **Al escribir documentación o informes:** nada que vigilar. Ya no contaminan.
- **Al añadir clases a un fichero fuera de `src/`** (por ejemplo `index.html`, o
  cualquier plantilla externa que se añada algún día): **hay que declararlo** con
  su `@source` en `src/assets/main.css`. Si no, esas clases se caen del CSS **en
  silencio**, sin ningún error de build. Es la trampa del nuevo enfoque y está
  escrita en `docs/stack.md:196-200`. Por eso `index.html` ya va declarado,
  aunque hoy no lleve ninguna clase.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La línea que acota el escaneo a `src/` | `src/assets/main.css:15` |
| El porqué, en comentario | `src/assets/main.css:10-14` |
| `index.html` declarado explícitamente (+ porqué) | `src/assets/main.css:17-20` |
| Test que vigila que no se ensanche (compila el bundle real) | `src/assets/__tests__/tailwind-sources.spec.ts:82-94` |
| Lista de clases-sonda (partidas para no autoemitirse) | `src/assets/__tests__/tailwind-sources.spec.ts:24-33` |
| Test: las sondas siguen siendo sondas válidas | `src/assets/__tests__/tailwind-sources.spec.ts:101-112` |
| Test: el CSS no trae las clases citadas solo fuera de `src/` | `src/assets/__tests__/tailwind-sources.spec.ts:114-116` |
| Test: el CSS sí trae todo lo que usa `App.vue` | `src/assets/__tests__/tailwind-sources.spec.ts:118-126` |
| Las 4 clases del shell que deben sobrevivir | `src/App.vue:2` |
| Documentación completa de la lista blanca | `docs/stack.md:167-212` |
| La consecuencia práctica y la trampa | `docs/stack.md:196-200` |
| Aviso: `src/` se escanea entero, tests incluidos | `docs/stack.md:208-212` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ **"El CSS de producción ya no contiene clases que solo aparecen citadas en
  documentación (`bg-chart-3`, `fill-chart-3`, `text-red-500`, `container`)"** →
  se cumple. El reviewer compiló y contó: **0 apariciones de las cuatro**, cuando
  antes estaban todas. Queda automatizado en
  `src/assets/__tests__/tailwind-sources.spec.ts:114-116`, que además vigila una
  quinta (`bg-negative-subtle`).
- ✅ **"Las clases que la app sí usa siguen ahí y la app se sigue viendo
  exactamente igual"** → se cumple, y se comprobó a fondo porque era el punto
  fácil de romper en silencio. Las 4 utilidades del shell (`min-h-screen`,
  `bg-surface-app`, `text-ink-body`, `antialiased`) siguen, con la misma
  declaración. Comparando los dos CSS compilados: **la capa base es byte-idéntica**
  (es la que pinta fondo, tipografía y tamaño base) y **todos los bloques de
  tokens son byte-idénticos**; lo único que desaparece son utilidades muertas y
  las variables que solo ellas usaban, sin dejar ninguna referencia rota. Además,
  capturas del navegador antes/después con el **mismo sha256**. Automatizado en
  `src/assets/__tests__/tailwind-sources.spec.ts:118-126`, que lee las clases de
  `App.vue` en caliente, así que el test seguirá a la app sin tener que editarlo.
- ✅ **"Cuando añada más documentación o más informes en `progress/`, el CSS de
  producción no cambia por ello"** → se cumple, y hay una prueba bonita: al añadir
  el propio informe y el nuevo test, el CSS salió con **el mismo hash**
  (`index-DWXM5jDg.css`). Este resumen que estás leyendo tampoco lo cambiará.
- ✅ **"`pnpm build` y `./init.sh` siguen en verde"** → se cumple. El reviewer
  ejecutó los cuatro comandos del gate: `./init.sh` exit 0 (6 ficheros de test,
  **49/49**), `pnpm type-check` exit 0, `pnpm lint` exit 0, `pnpm build` exit 0.

## Decisiones que se tomaron por ti

Lo que delegaste explícitamente en el agente:

- **(delegado) Cómo dejarlo protegido con un test.** Se hizo un test **de efecto**,
  no de configuración: compila el bundle de producción de verdad y mira el CSS
  resultante (`src/assets/__tests__/tailwind-sources.spec.ts`). Un test que
  buscara la cadena `source('../')` en `main.css` habría sido inútil: seguiría en
  verde si el escaneo se ensanchara por otra vía. El reviewer lo comprobó
  quitando el acotado: el test **se pone rojo** (5 fallos). Cuesta ~1 s; la suite
  entera sigue en 1,7 s.
  - **Detalle que conviene que sepas** (te va a hacer falta el día que toques ese
    test): como ahora `src/` se escanea entero, **los tests también cuentan**. Si
    en un test escribes el nombre de una clase entre comillas, Tailwind la emite a
    producción. Por eso ese fichero **compone los nombres troceados** en tiempo de
    ejecución (`src/assets/__tests__/tailwind-sources.spec.ts:24`). Está explicado
    ahí mismo y en `docs/stack.md:208-212`.
  - El test también **se autovigila**: si un día la documentación deja de citar
    una de las clases-sonda, el test avisa de que esa sonda ya no prueba nada en
    vez de quedarse verde de mentira.
- **(delegado) Qué hacer con `index.html`.** Se decidió **declararlo
  explícitamente** (`src/assets/main.css:20`) además de documentarlo. El motivo:
  es código de aplicación tuyo y el fallo que evita es silencioso — sin esa línea,
  poner `class="h-full"` en el `<html>` no da ningún error, simplemente no pinta.
  Se verificó con una prueba real (con la línea, la clase se emite; sin ella,
  desaparece). No reabre el juego de topos porque es una **inclusión** fija y
  conocida, no una exclusión reactiva.

## Qué NO se tocó / quedó fuera

- **Ningún token ni ninguna entrada de `@theme inline`.** El diff de `main.css`
  son 15 líneas, todas en el bloque del `@import`; `src/assets/styles/**` ni
  aparece. Cero cambios visuales, como pediste.
- **No se maquetó ninguna pantalla** ni se portó ningún componente del design
  system.
- **No se añadió ninguna dependencia** y no se tocó `App.vue`, `design-system/`
  ni `init.sh`.

## Notas para el futuro

- **Deuda D1 — la única clase de la paleta de Tailwind que sigue colándose.**
  `src/__tests__/App.spec.ts:30` escribe literalmente `'bg-gray-50'` para afirmar
  que el shell **no** la usa… y como ese fichero está en `src/`, Tailwind la lee y
  la emite. Resultado paradójico: la clase viaja a producción precisamente porque
  un test dice que no se usa. Es de otra feature (#4) y por eso no se tocó aquí.
  No incumple ningún criterio de esta feature —tu `intent` pide acotar a "tu
  código de aplicación", y un test lo es—, pero conviene saldarla. Arreglo: una
  línea, partiendo el nombre igual que hace el test nuevo, o afirmando sobre las
  clases presentes en vez de sobre una ausente. Alternativa más ambiciosa, a
  decidir contigo: excluir del escaneo los `__tests__/`.
- **Los selectores `.com` y `.googleapis`** que quedan en el CSS no vienen del
  escaneo, sino del `@import` remoto a Google Fonts. Se irán el día que se bajen
  las webfonts en local (deuda ya anotada en `docs/stack.md`).
- **Regla a recordar al añadir ficheros:** si algún día entra una plantilla o un
  HTML fuera de `src/`, hay que declararlo con `@source` en `main.css`. El test no
  detecta ese caso (detecta lo contrario, que el escaneo se ensanche), así que es
  la única cosa que sigue dependiendo de que alguien lo recuerde — y por eso está
  escrita en `docs/stack.md:196-200`.
