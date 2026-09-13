# Resumen — feature 10 `dark-theme`

Fecha de cierre: 2026-09-13
Intención original: `feature_list.json` → feature `dark-theme`, bloque `intent`
Spec: no aplica (la feature no es SDD)

## Qué hace ahora la app que antes no

Toda la app se ve en oscuro, no solo la barra lateral. La zona central, la barra
superior, las tarjetas, los badges y los avisos tienen ahora fondos oscuros. Todo
lo que se veía antes se sigue leyendo, y un test mide el contraste de cada
combinación de color. Antes el centro de la pantalla era blanco.

Además queda como regla. El tema cambia los colores "con nombre" del design system
(fondo de tarjeta, texto secundario, borde…), no cada componente. Así, cualquier
componente que se porte en el futuro con esos nombres sale oscuro sin hacer nada.
No hay selector claro/oscuro: la app es oscura y ya está.

## Por dónde se usa (puntos de entrada)

- No hay nada que pulsar: `pnpm dev` y cualquier ruta (`/net-worth`, `/overview`,
  `/movements`, `/investments`, `/import`) sale en oscuro.
- Para cambiar un tono se edita `src/assets/theme-dark.css`, siempre apuntando a
  un color de la paleta del design system. Nunca se edita el componente.
- Si un componente pone un color de texto sobre un fondo nuevo, se añade una
  línea `contrast:` en la cabecera de ese archivo. El test la mide sola.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Carga del tema para toda la app, después de los tokens del design system | `src/assets/main.css:32` |
| Los colores del tema oscuro (alias redefinidos) | `src/assets/theme-dark.css:99` |
| `color-scheme: dark` (scrollbars y controles nativos oscuros) | `src/assets/theme-dark.css:101` |
| Tonos de fondo: zona central, tarjetas, sidebar | `src/assets/theme-dark.css:113` a `:117` |
| Lista de pares de contraste que se miden (61) | `src/assets/theme-dark.css:18` a `:96` |
| Excepción de la inicial de banco (a 3:1) y sus límites | `src/assets/theme-dark.css:71` |
| Test: el tema se carga después de los tokens | `src/assets/__tests__/theme-dark.spec.ts:159` |
| Test: solo alias existentes, sin colores literales | `src/assets/__tests__/theme-dark.spec.ts:168` |
| Test: ningún fondo claro | `src/assets/__tests__/theme-dark.spec.ts:191` |
| Test: contraste WCAG de cada par | `src/assets/__tests__/theme-dark.spec.ts:207` |
| Test: todos los colores del puente de Tailwind están medidos | `src/assets/__tests__/theme-dark.spec.ts:211` |
| Test: ningún `.vue` con colores crudos | `src/assets/__tests__/theme-dark.spec.ts:239` |
| Regla «la app es solo oscura» | `docs/conventions.md:270` |
| Excepción de texto a 3:1 documentada | `docs/conventions.md:293` |
| Dónde vive el tema | `docs/stack.md:187` |
| Capturas antes/después | `progress/implementation/dark-theme/` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ **«No queda ningún fondo claro a la vista: ni la página, ni la barra superior,
  ni las tarjetas, ni los badges o avisos.»** → se cumple. El test
  `theme-dark.spec.ts:191` comprueba que los 11 fondos no pasan de `neutral-700`.
  El revisor lo confirmó además en Chromium: recorrió los estilos de las 5 rutas y
  lo único claro son rellenos de datos (barras, puntos, fichas de banco). Capturas
  `after-*.png`.
- ✅ **«Todo lo que veo hoy se sigue viendo y leyendo.»** → se cumple. Se miden 61
  pares en `theme-dark.spec.ts:207`: texto a 4.5:1 y barras, bordes e iconos a 3:1.
  El más justo es el enlace sobre la zona central (4.56). Los estados de carga,
  error, descuadre, avisos, «No valuation» y saldo negativo se ven en
  `after-state-*.png`.
- ✅ **«Las barras de reparto se distinguen del fondo y entre sí.»** → se cumple.
  Los 8 colores de barra dan entre 4.25 y 8.84 sobre la pista
  (`theme-dark.css:55-62`), y los colores de las barras no se han tocado.
- ✅ **«Las vistas placeholder también se ven en oscuro y legibles.»** → se cumple.
  Usan la misma tarjeta y los mismos colores. Captura `after-placeholder-overview.png`.
- ✅ **«La sidebar sigue oscura y se distingue de la zona central.»** → se cumple. La
  sidebar usa `neutral-950` y la zona central `neutral-800`. El par a 1.25 como
  mínimo (da 1.34) está en `theme-dark.css:93`: si alguien iguala los dos tonos,
  el test falla.
- ✅ **«Un componente portado en el futuro sale en oscuro sin hacer nada especial, y
  las convenciones lo dejan escrito.»** → se cumple. Las utilidades de Tailwind
  leen la variable del tema, cosa que el revisor comprobó en el build. El test
  `theme-dark.spec.ts:239` impide colores crudos en los `.vue`, y la regla está en
  `docs/conventions.md:270`.

## Decisiones que se tomaron por ti

- (delegado) **Tonos:** sidebar `neutral-950` (la más oscura), zona central y
  topbar `neutral-800`, tarjetas `neutral-900`. Todos son de la paleta del design
  system (`theme-dark.css:113`).
- (delegado) **Cómo aplicarlo:** un archivo propio que redefine los alias
  semánticos, cargado después de los tokens. No se ha editado ni `src/assets/styles/`
  ni ningún componente.
- (delegado) **Cómo medir el contraste:** los pares se escriben en el propio archivo
  del tema y el test los lee de ahí, así que no pueden desincronizarse.
- (delegado) **Color de negativos, enlaces e info:** el rojo y el azul del design
  system no llegaban a 4.5:1 en oscuro. Los negativos pasan a coral (`chart-6`) y
  los enlaces e info a `chart-3` (`theme-dark.css:126`, `:137`, `:141`).
- (delegado) **Texto sobre color** (`ink-on-brand`): pasa de blanco a casi negro,
  porque con blanco varias fichas de banco ya se leían mal.
- (añadido) **Excepción de la inicial de banco:** la letra de la ficha se mide a 3:1,
  no a 4.5:1. Está oculta a lectores de pantalla y repite la inicial del nombre
  escrito al lado, y ningún color de la paleta llega a 4.5 en los 8 fondos. La
  excepción solo vale si se cumplen las dos condiciones
  (`theme-dark.css:71-77`, `docs/conventions.md:293`).

## Qué NO se tocó / quedó fuera

- Ningún `.vue`, ni `src/assets/styles/`, `design-system/`, `e2e/` o `package.json`.
- Sin selector de tema claro/oscuro.
- Sin cambios de textos, distribución ni datos.

## Notas para el futuro (opcional)

- **Anillo de foco** (`--ring-brand`): sigue con el verde del tema claro. Cuando
  haya inputs o botones con foco, conviene medirlo en oscuro.
- **Pista de la barra de reparto:** apenas se distingue de la tarjeta, igual que en
  claro. La información está en el relleno y en el porcentaje escrito.
- **Sombras:** casi no se ven sobre oscuro; los bordes ya separan las tarjetas.
- **Vue DevTools:** su botón flotante blanco solo sale en `pnpm dev`, no en el build.
- **Referencias de línea del informe:** algunas quedaron desplazadas unas líneas
  tras la segunda ronda; este resumen usa las buenas.
