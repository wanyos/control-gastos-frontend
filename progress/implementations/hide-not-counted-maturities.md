# Cabo 37 (b) — la casilla `Hide what does not count` y los vencimientos de depósito — implementación

**Estado: bloqueado antes de tocar código.** No se ha cambiado ningún archivo de
`src/` ni de `e2e/`. No se ha escrito en la base de datos ni en las carpetas de datos
del humano.

## 1. El fallo es real según el contrato

Comprobado leyendo `../gastos-backend/docs/api-contract.md` (`GET /api/movements`,
«Movimientos de depósito en las sumas», feature 57 del backend):

- `excluded=none` deja solo `excludedFromTotals: false`, y **desde la feature 57 filtra
  por la marca también en los movimientos de depósito, aunque en ellos la marca no
  cambie lo que suman** (tabla de parámetros, fila `excluded`).
- `transfer=none` deja solo `transferId: null`, sin excepción para depósitos.
- «`excludedFromTotals`, `transferId` y `productId` no cambian lo que suma un
  movimiento de depósito»: un vencimiento con capital cierto suma su interés
  (`deposit.countedAmount`) esté marcado o emparejado. El contrato lo dice también
  para `excluded=only` / `transfer=only` («un vencimiento de depósito marcado (o con
  `transferId`) sí suma su interés también ahí») y para deshacer una pareja.
- Cómo puede llegar a estar así: la marca se puede seguir poniendo con
  `PATCH /api/movements` (la feature 57 solo quitó las marcas que había); el
  emparejamiento lo pone la detección de traspasos en cada importación, y el contrato
  contempla «una pierna que sea un movimiento de depósito».

Además, el fallo no se limita a la lista: con la casilla puesta, los `totals` que
pinta `MonthTotals` son los de la misma petición filtrada
(`monthQuery` en `src/features/statement/filters.ts`, líneas 78-81), así que el
interés de ese vencimiento **también faltaría en las cifras de arriba**.

Cómo pinta hoy `StatementRow.vue` ese movimiento sin la casilla: si `deposit` no es
nulo no enseña `Transfer` ni `Not counted`, no tacha el importe (gris) y debajo pone
`Counts <interés>`. Es decir, la fila dice que cuenta, y con la casilla desaparece.

## 2. Qué filtros da el contrato

`accountId`, `from`, `to`, `type`, `status`, `categoryId`, `uncategorized`, `q`,
`transfer` (`only`/`none`), `excluded` (`only`/`none`), `ownership` (`doubtful`),
`page`, `pageSize`. **No hay ninguno por `deposit`** ni por «lo que suma». Con una
sola petición no se puede pedir «sin marcados ni emparejados, salvo los vencimientos
que suman».

## 3. Por qué paro

Hay una forma de hacerlo solo en el frontend sin inventar nada del contrato, pero
**cambia cosas que el usuario ve aparte de que el vencimiento deje de esconderse**, y
me pediste parar en ese caso.

**Opción A (solo frontend).** Con la casilla puesta, dejar de mandar `excluded=none` y
`transfer=none` y quitar esas filas en el navegador con los campos que ya trae cada
movimiento (`excludedFromTotals`, `transferId`, `deposit`), salvo un vencimiento con
capital cierto. Ya hay precedente: `hiddenBySwitch` en
`src/features/statement/store.ts` quita en el navegador las aperturas y
cancelaciones de depósito (F31) y el dinero entre tus cuentas (F35), porque el
backend no tiene filtro para eso. Es una sola petición, no se mezclan dos.
Lo que cambiaría a la vista:

1. Las cifras de arriba con la casilla puesta pasan a ser las del mes sin esconder.
   Según el contrato son las mismas salvo en el caso del fallo (lo que esconde la
   casilla suma 0, salvo ese vencimiento), donde ahora sí incluirían su interés.
   Es la corrección que pide el cabo, pero es un cambio en las cifras. Esto es
   lectura del contrato; no lo he comprobado contra el backend.
2. En un mes de más de 200 movimientos (`STATEMENT_PAGE_SIZE`), `Hiding N movements`
   y el número de movimientos de la lista contarían solo lo de las páginas ya
   cargadas, como ya pasa hoy con lo que se quita en el navegador; y `Load more`
   traería páginas con filas que luego se esconden. Hoy, para marcados y
   emparejados, ese número es exacto porque lo cuenta el backend. Con los datos de
   hoy no se notaría (el roadmap, cabo 37 (a), dice que el mes más cargado tiene unos
   93), pero no lo he comprobado ahora.
3. La segunda petición que cuenta lo escondido (`hiddenCountQuery`) dejaría de
   distinguir nada; habría que decidir si se quita.

**Opción B (backend).** Que el backend dé un filtro que deje fuera los marcados y los
emparejados **salvo** los movimientos de depósito que suman algo, por ejemplo un
valor nuevo en `excluded`/`transfer` o un parámetro propio, con `pagination` y
`totals` de ese filtro. Entonces el frontend solo cambia los dos parámetros que manda
`monthQuery` y nada más se mueve. Haría falta decidir en el backend qué pasa con un
vencimiento dudoso marcado (suma 0: lo lógico es que se siga escondiendo) y con
aperturas y cancelaciones marcadas (suman 0: se siguen escondiendo). Es una
feature del backend, en su sesión, antes que la del frontend.

Descartado: pedir dos veces (`excluded=none&transfer=none` más otra con
`excluded=only` o `transfer=only`) y mezclar. Habría que sumar a mano los `totals` de
las dos y mezclar dos paginaciones, que es lo que pediste no hacer. Buscar los
vencimientos por `q=INTERESES DEP` tampoco vale: es copiar en el navegador la regla
del backend, que el contrato no promete como filtro.

## Archivos modificados / creados
- Este informe. Nada más.

## Documentos actualizados
Ninguno: no se ha cambiado comportamiento.

## Último ./init.sh / npx playwright test
No lanzados: no se ha cambiado código, así que no hay nada nuevo que comprobar. No he
comprobado el estado actual de la suite.

## Qué hace falta para seguir
Que el humano elija entre A (y acepte los puntos 1-3) o B (feature del backend
primero).
