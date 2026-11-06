# Cabo 46 — el aviso arriba de la lista en una ventana baja: no es un fallo

No he cambiado nada de código, de pruebas ni de `docs/`. Tampoco he hecho commits.

## Qué dice el spec de la F27

- **R6** (`specs/27-action-notice-in-view/requirements.md`): «MIENTRAS la página no esté
  bajada, el sistema DEBE pintar el aviso en el sitio que ocupa hoy: dentro del flujo de la
  página, entre los mismos dos bloques que lo rodean hoy en cada pantalla y sin solaparse
  con ninguno de ellos». Viene de la frase del humano «Si estoy arriba del todo, lo sigo
  viendo, como hasta ahora».
- R6 **no** pide que, arriba del todo, el aviso quepa entero en la ventana: pide que esté
  donde estaba antes de la F27. Si la ventana es más baja que ese sitio, antes de la F27
  tampoco se veía sin bajar un poco.
- La task de esa prueba (T15 de `tasks.md`) pide lo mismo que R6: que el aviso esté entre
  sus dos bloques, sin solaparse y sin pegarse a la barra de arriba. La comprobación de que
  el aviso queda entero dentro de la ventana (`expectInView`, líneas 959, 981 y 991 de
  `e2e/action-notice-in-view.spec.ts`) es un añadido de la prueba. Con la ventana de
  1280 × 720 para la que está escrita (lo dice el comentario de la cabecera del archivo)
  se cumple.

## Por qué falla la prueba con 731 × 411

La prueba elige la categoría de la primera fila de `Review` con `selectOption`, que no
desplaza la página. Con 731 × 411 esa fila empieza en 533 px: **está fuera de la ventana**.
La prueba hace algo que el usuario no puede hacer: tocar una fila que no ve sin bajar
antes. Con la página bajada lo justo para ver la fila, el aviso sale encima de ella y
queda dentro de la ventana (medido abajo).

## Lo que he medido (Chromium; cada vez con un archivo de pruebas temporal en `e2e/`, que he borrado después)

Las respuestas de `/api` eran inventadas: las rutas de `page.route` de
`e2e/action-notice-in-view.spec.ts`, sin backend.

### 1. Dónde queda el aviso, con la página arriba del todo, después de la acción

Comando: `npx playwright test e2e/zz-cabo46-measure.spec.ts --project=chromium -g measure --reporter=line`
→ `8 passed (20.0s)`.

| Ventana | `Review`: primera fila antes de la acción | `Review`: `action-summary` (arriba–abajo) | `Movements`: `statement-action-summary` | `Transfers`: `transfers-action-summary` |
|---|---|---|---|---|
| 1280 × 720 | 473 | 400,9 – 432,9 | 525,5 – 557,5 (scrollY 0) | 132,7 – 164,7 |
| 1280 × 650 | 472 | 400,9 – 432,9 | 503,5 – 535,5 (scrollY 22) | 132,7 – 164,7 |
| 1280 × 600 | 472 | 400,9 – 432,9 | 171,5 – 203,5 (scrollY 354) | 132,7 – 164,7 |
| 1280 × 500 | 472 | 400,9 – 432,9 | 121,5 – 153,5 (scrollY 404) | 132,7 – 164,7 |
| 1366 × 600 | 472 | 400,9 – 432,9 | 171,5 – 203,5 (scrollY 354) | 132,7 – 164,7 |
| 731 × 600 | 533 | 461,5 – 493,5 | 172,1 – 204,1 (scrollY 414) | 120,7 – 152,7 |
| 731 × 411 | 533 | **461,5 – 493,5** | 77,1 – 109,1 (scrollY 509) | 120,7 – 152,7 |

En `Movements` la prueba hace clic (Playwright baja la página hasta la fila), así que con
ventanas bajas ya no está arriba del todo y el aviso queda pegado bajo la barra de arriba.

**Alto mínimo** para que esa prueba vea el aviso entero en `Review` con la página arriba:
433 px de ventana con 1280 de ancho y 494 px con 731 de ancho (con 731 los filtros ocupan
más y todo baja unos 60 px). Un portátil con 600–700 px de alto útiles queda por encima de
los dos.

### 2. Lo que puede hacer un usuario: bajar hasta ver una fila y tocarla

Para cada ventana y cada desplazamiento de partida, la prueba elegía la primera fila cuyo
desplegable de categoría se viera entero por debajo de la barra de arriba, le ponía una
categoría y miraba si `action-summary` quedaba entero en la ventana y sin nada encima
(el mismo criterio que `expectInView`).

Comando: `npx playwright test e2e/zz-cabo46-measure.spec.ts --project=chromium -g user --reporter=line`
→ `30 passed (22.2s)`. Resultado:

| Ventana | Desplazamiento de partida (px) | Resultado |
|---|---|---|
| 731 × 411 | 0, 60, 125, 150, 200 | No se ve ninguna fila: no hay nada que tocar sin bajar más |
| 731 × 411 | 300, 380, 400, 450, 700 | El aviso queda entero a la vista en los 5 |
| 1280 × 411 | 0, 60 | No se ve ninguna fila |
| 1280 × 411 | 125, 150, 200, 300, 380, 400, 450, 700 | El aviso queda entero a la vista en los 8 |
| 731 × 500 | 0, 60 | No se ve ninguna fila |
| 731 × 500 | 125, 150, 200, 300, 380, 400, 450, 700 | El aviso queda entero a la vista en los 8 |

En ningún caso que el usuario pueda provocar queda el aviso fuera de la ventana: el aviso
se coloca justo encima de la lista, así que si se ve la primera fila, el aviso también.

### 3. Si el aviso ya está y el usuario está arriba del todo en una ventana baja

Ventana de 731 × 411, acción como la de la prueba (aviso abajo en 493,5), y después la
rueda del ratón (comando: `npx playwright test e2e/zz-cabo46-measure.spec.ts --project=chromium -g wheel --reporter=line` → `1 passed (8.2s)`):

```
sy=0     summary 461.5-493.5 of 411
sy=100   summary 361.5-393.5 of 411
sy=200   summary 261.5-293.5 of 411
sy=500   summary 68.0-100.0 of 411
sy=2500  summary 68.0-100.0 of 411
```

Con una vuelta de la rueda aparece; al seguir bajando se queda pegado bajo la barra de
arriba, como pide R1. Arriba del todo está en su sitio de siempre, que es lo que pide R6.

## Conclusión

No es un fallo: la aplicación cumple R6, y la prueba falla con 731 × 411 porque toca una
fila que en esa ventana no se ve. La prueba está escrita para 1280 × 720 (los proyectos de
`playwright.config.ts` usan esa ventana en los tres navegadores) y ahí pasa.

## Comandos ejecutados y estado final

- Los tres comandos de arriba, con un archivo temporal `e2e/zz-cabo46-measure.spec.ts`
  (copia de las rutas inventadas de `e2e/action-notice-in-view.spec.ts` más las
  mediciones). Borrado al acabar; `git status --short` después: vacío.
- No he lanzado `./init.sh` ni la suite de los tres navegadores: no he cambiado código.
- `docs/`: nada ha quedado falso; no he tocado nada. `docs/roadmap.md` no lo he tocado.

## Sugerencias fuera de scope (NO aplicadas)

- La prueba podría elegir la categoría solo de una fila que se vea (bajando antes hasta
  ella), para que no dependa del alto de la ventana. Ahora mismo no hace falta: todos los
  proyectos usan 1280 × 720.
