# Resumen — feature 8 `app-shell`

Fecha de cierre: 2026-09-12
Intención original: `feature_list.json` → feature `app-shell`, bloque `intent`
Spec: no aplica (la feature no es SDD)

## Qué hace ahora la app que antes no

La app ya tiene forma de aplicación. Al abrirla ves una barra lateral oscura a la
izquierda con cinco entradas (Net Worth, Overview, Movements, Investments e
Import), cada una con su icono, y una barra superior con el título de la pantalla
en la que estás. Al pulsar una entrada cambia la URL, cambia el título y la
entrada se marca en verde. Antes era una página en blanco sin navegación.

Ojo: **las pantallas todavía están vacías**. Cada ruta muestra una tarjeta con su
nombre y una línea que dice que aún no está construida. La de Patrimonio la
construye la feature 9.

## Por dónde se usa (puntos de entrada)

- `pnpm dev` y abrir `http://localhost:5173`: `/` te lleva a `/net-worth`.
- Rutas: `/net-worth` (home), `/overview`, `/movements`, `/investments`, `/import`.
- Para añadir una pantalla a la barra lateral basta una ruta con
  `meta: { label, icon }` en `src/router/index.ts`: la sidebar y el título salen
  de ahí solos.
- Iconos: `import { Wallet } from '@lucide/vue'`, uno a uno por nombre.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Las cinco rutas y sus labels/iconos | `src/router/index.ts:28` |
| La redirección de `/` a `/net-worth` | `src/router/index.ts:29` |
| Lista de la sidebar derivada de las rutas | `src/router/index.ts:69` (`navEntries`) |
| Tipado de `meta.label` / `meta.icon` | `src/router/index.ts:9` |
| El layout (sidebar + topbar + área de la vista) | `src/shared/components/AppShell.vue:2` |
| La sidebar y la marca de entrada activa | `src/shared/components/AppSidebar.vue:15` (activa en `:24`) |
| El arreglo de los enlaces azules/subrayados | `src/shared/components/AppSidebar.vue:32` y `:55` |
| El título de la topbar | `src/shared/components/AppTopBar.vue:17` |
| La tarjeta placeholder compartida | `src/shared/components/PlaceholderView.vue:2` |
| El placeholder de Patrimonio (lo sustituye la F9) | `src/features/net-worth/views/NetWorthView.vue:2` |
| `App.vue` monta el shell | `src/App.vue:3` |
| Idioma y título de la pestaña | `index.html:2` y `:7` |
| Dependencia de iconos | `package.json:20` |
| Tests del shell (8) | `src/shared/components/__tests__/AppShell.spec.ts:24` |
| Tests del router (10) | `src/router/__tests__/router.spec.ts:18` |
| Lucide documentado | `docs/stack.md:235` y `docs/conventions.md:214` |
| La trampa de `base.css` documentada | `docs/conventions.md:223` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ **«Cuando abro la app en pnpm dev, se ve una sidebar a la izquierda con los
  enlaces de navegación y una topbar con el título.»** → se cumple. Verificado en
  `AppShell.spec.ts:25` (sidebar con las cinco entradas y topbar), `:33` (un
  icono por entrada) y `:40` (título de la ruta en la topbar). El revisor lo
  comprobó además en Chromium contra el dev server: sidebar de 248px con el fondo
  del token, topbar de 60px, sin errores de consola.
- ✅ **«Cuando hago clic en Net Worth en la sidebar, la URL cambia a /net-worth
  y se renderiza el componente correspondiente en RouterView.»** → se cumple.
  Verificado en `router.spec.ts:25` (`/` acaba en `/net-worth`), `:35` (cada ruta
  tiene su componente), `AppShell.spec.ts:46` (la vista se pinta dentro de
  `<main>`) y `:62` (al cambiar de ruta cambian vista, título y entrada activa).
  **Matiz:** el clic en sí no tiene test unitario (los tests cambian la ruta por
  código); el revisor hizo el clic real en Chromium sobre «Movements» y «Net
  Worth», y la URL, el título y la entrada activa cambiaron sin recargar la página.
- ✅ **«Ningún texto, ruta ni identificador queda en español.»** → se cumple.
  Verificado en `router.spec.ts:69` (ninguno de los labels del design system
  sobrevive) y `AppShell.spec.ts:82` (la marca dice `accounts`, no `cuentas`), y
  con búsqueda de tildes y de palabras españolas en todo el código nuevo: cero.
- ✅ **«El diseño se parece al del design system (Shell.jsx), con los tokens de
  color y tipografía del proyecto y sus iconos.»** → se cumple en lo esencial:
  sidebar oscura, marca con el punto en verde, entradas con icono, activa en
  verde sobre fondo verde translúcido, topbar translúcida con borde y título en
  la tipografía display. Solo alias semánticos (ni un color a mano) y los iconos
  son Lucide. El revisor comparó los colores y medidas calculados en el
  navegador con los tokens y coinciden. No hay test unitario de «parecido»
  (jsdom no calcula estilos); lo que sí vigila un test es que
  `src/assets/styles/` no se haya alterado.

## Decisiones que se tomaron por ti

- (delegado) **Paquete de iconos: `@lucide/vue` 1.45.0**, el oficial de Lucide
  para Vue. `lucide-vue-next` está marcado como obsoleto en npm (comprobado por
  el revisor). Se importa un icono por nombre y el build lleva solo los 5 usados.
- (delegado) **Iconos**: Net Worth → `Wallet`, Overview → `LayoutDashboard`,
  Movements → `ArrowLeftRight`, Investments → `ChartLine`, Import → `FileUp`.
- (delegado) **Rutas todas en un archivo** (`src/router/index.ts`), no una por
  feature: son cinco y cuatro son placeholder. Las rutas son a la vez el menú
  (`meta.label` / `meta.icon`), así ruta y entrada no pueden desincronizarse.
- (delegado) **Placeholder mínimo**: una tarjeta con el nombre y una línea de texto.
- (delegado) **Título de `index.html`**: `control·accounts — personal finance`.
- (añadido) **La marca se traduce a `control·accounts`.** El design system dice
  `control·cuentas`; como no se deja texto en español, se tradujo. Es un nombre
  de marca: si prefieres otro, se cambia en `AppSidebar.vue:10` e `index.html:7`.
- (añadido) **Arreglo de los enlaces azules.** Los estilos base del design system
  pintan todos los enlaces de azul y los subrayan al pasar el ratón, y ganan a
  las clases de Tailwind. Sin tocar esos estilos (son copia literal), el color se
  pone en un elemento dentro del enlace y el subrayado se quita con una regla CSS
  de una línea en el propio componente. Queda anotado en `docs/conventions.md`
  para la próxima pantalla con enlaces.
- (añadido) **El shell vive en `src/shared/components/`**, no en una feature,
  porque lo usan todas.

## Qué NO se tocó / quedó fuera

- **No se construyó la vista de Patrimonio**: `/net-worth` es un placeholder y no
  llama a la API. Es la feature 9.
- Del `Shell.jsx` **no se portaron** la caja de búsqueda, la campana, el botón
  «Nuevo movimiento», el avatar ni la tarjeta «Plan»: serían botones sin nada
  detrás. Tampoco el logo en SVG (habría que copiar el asset). Ni las entradas
  «Presupuestos» y «Metas de ahorro», que no están en el roadmap.
- No se tocó el e2e de humo, ni `src/assets/styles/`, ni `design-system/`, ni
  nada de la feature 7.
- No hay página 404: una URL desconocida muestra el shell con el área vacía.
- La barra lateral no se pliega en pantallas estrechas (responsive pendiente).

## Notas para el futuro (opcional)

- Conviene un test que haga **clic** en una entrada de la sidebar y compruebe la
  URL: el enlace usa un cableado manual (`AppSidebar.vue:27`) que hoy solo está
  verificado a mano en navegador.
- `src/assets/__tests__/tailwind-sources.spec.ts:118` solo comprueba las clases
  de `App.vue`; con el shell, la mayoría de la UI está en otros `.vue`.
- Confirmar el nombre de marca `control·accounts`.
- El texto activo usa el verde `--accent` en vez del verde más claro de la
  referencia, porque ese tono no tiene alias semántico.
