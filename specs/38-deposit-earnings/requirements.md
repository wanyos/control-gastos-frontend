# Requirements — F38 `deposit-earnings`

Fuente de verdad del QUÉ: el bloque `intent` de la feature 38 en `feature_list.json`.
Fuente de verdad de la API: `../gastos-backend/docs/api-contract.md`, sección
«`GET /api/investments/deposits`». Seis `status`: `active`, `matured`,
`below_principal`, `maturity_not_found`, `ambiguous`, `cancelled`. Solo `matured` lleva
`earned`; `total` es la suma de esos y la manda el backend.

«La parte» = la tarjeta nueva `Deposits` de la pantalla Net Worth.
«Dudoso» = un depósito con `status` `maturity_not_found`, `ambiguous` o
`below_principal`.
Los textos exactos de pantalla están en `design.md §4`; los requirements los citan.

## R1
CUANDO se monta la pantalla Net Worth, el sistema DEBE pedir
`GET /api/investments/deposits` exactamente una vez, además de `GET /api/net-worth`.

## R2
MIENTRAS el patrimonio está cargado, el sistema DEBE pintar la parte `Deposits` como
una tarjeta a todo el ancho, debajo de la sección `Details`.

## R3
CUANDO llega la respuesta de depósitos, el sistema DEBE pintar una fila por cada
elemento de `deposits`, sea cual sea su `status`, en el mismo orden en que llegan.

## R4
El sistema DEBE enseñar en cada fila el banco (`bankLabel(bank)`), el nombre, el
`principal` (`Put in`), la fecha de apertura (`Opened`), la fecha de vencimiento con su
verbo según el estado (`Matures` / `Matured` / `Was due`) y el `expectedGain`
(`Expected`); un campo que llegue `null` DEBE pintarse como `—`, nunca como `0,00 €`.

## R5
CUANDO un depósito tiene `status` `matured`, el sistema DEBE enseñar la etiqueta
`Matured` y su `earned` formateado, en verde, en la columna de lo ganado.

## R6
CUANDO hay al menos un depósito, el sistema DEBE enseñar arriba de la parte, con la
etiqueta `Earned by your deposits`, el `total` de la respuesta tal cual llega, y debajo
la frase de `design.md §4` que dice que solo suman los vencidos con su cobro y que no se
suma al patrimonio.

## R7
CUANDO un depósito tiene `status` `active`, el sistema DEBE enseñar la etiqueta
`Active` y, en la columna de lo ganado, el texto `Not earned yet` en gris, sin cifra.

## R8
CUANDO un depósito tiene `status` `cancelled`, el sistema DEBE enseñar la etiqueta
`Cancelled`, la línea `Cancelled on <closedAt>, before it matured`, la fila entera en
gris y, en la columna de lo ganado, `Not in the total`.

## R9
CUANDO un depósito es dudoso, el sistema DEBE enseñar la etiqueta `Doubtful` en ámbar,
la línea ámbar `Doubtful · <motivo>` con el motivo de su `status` (`design.md §4`) y, en
la columna de lo ganado, `Not in the total` en ámbar.

## R10
CUANDO la respuesta trae `deposits: []`, el sistema DEBE pintar en la parte el texto
`You have no deposits yet.` y NO DEBE pintar el total.

## R11
El sistema NO DEBE sumar el `total` de depósitos ni ningún `earned` a ninguna cifra de
la pantalla: `Net worth`, `By type`, `By bank` y `Details` DEBEN enseñar lo que manda
`GET /api/net-worth`, igual que sin depósitos.

## R12
SI la petición de depósitos falla o su respuesta no cumple el contrato ENTONCES el
sistema DEBE pintar en la parte la tarjeta `Couldn't load your deposits` con el mensaje
del error, y el resto de Net Worth DEBE seguir pintándose.

## R13
CUANDO un depósito tiene `maturity` (`status` `matured` o `below_principal`), el
sistema DEBE ofrecer el enlace `See in Movements`, que lleva a `/movements` con
`month` igual al mes de `maturity.date` (`YYYY-MM`).

## R14
CUANDO termina una importación y el patrimonio ya estaba cargado, el sistema DEBE volver
a pedir `GET /api/investments/deposits`.

## R15
MIENTRAS la petición de depósitos está en curso, el sistema DEBE pintar en la parte el
texto `Loading your deposits…`.

## Procedencia

- R1 — (delegado) Sale de «una parte nueva con todos mis depósitos» y del `por_que`
  («el backend ya lo calcula»). Decido una petición propia al abrir la pantalla, en
  paralelo a la del patrimonio.
- R2 — (delegado) El humano cedió «en qué sitio de Net Worth va». Decido lo que propuso
  el leader: una tarjeta propia debajo de `Details`. Alternativa: dentro de cada tarjeta
  de banco (mezcla vivos con cerrados que ya no son patrimonio).
- R3 — (humano + delegado) «Veo todos mis depósitos, también los que se cerraron hace
  meses» (humano). El orden lo cedió: decido el del backend (vencimiento más reciente
  primero, los vivos arriba de forma natural) en una sola lista.
- R4 — (humano) «el banco, el nombre, cuánto metí, cuándo lo abrí y cuándo vence o
  venció, cuánto esperaba ganar». El `—` para un `null` es (añadido): el contrato
  permite `null` en esos campos; pintar 0 sería inventar un dato.
- R5 — (humano) «Un depósito que venció y cuyo cobro está en el extracto enseña lo que
  ganó». La etiqueta `Matured` es (delegado, textos).
- R6 — (humano) «Arriba, el total ganado entre todos» y «El total es la suma de esos y de
  ninguno más». La frase bajo el total es (delegado, textos).
- R7 — (humano) «Un depósito vivo enseña lo que espera ganar y cuándo vence. Se ve que eso
  todavía no está ganado y no entra en el total».
- R8 — (humano + delegado) «Un depósito cancelado antes de vencer se distingue y no entra
  en el total» (humano). Que vaya en gris es lo cedido («si los cancelados se ven igual de
  destacados»).
- R9 — (humano, frase marcada «[añadido por el leader]» y aprobada) «se ve como dudoso y
  con el motivo. La pantalla dice que no entra en el total». Los textos de los motivos son
  (delegado). Que `below_principal` diga cuánto devolvió es (añadido): sale de
  `maturity.amount`, y sin la cifra el motivo no se entiende. ← REVISAR EN APROBACIÓN.
- R10 — (humano, frase marcada «[añadido por el leader]» y aprobada) «Si no hay ningún
  depósito, la parte lo dice». No pintar `0,00 €` es (añadido).
- R11 — (humano, frase marcada «[añadido por el leader]» y aprobada) «El total ganado no
  se suma al patrimonio ni a ninguna otra cifra de la pantalla». Más «No cambiar el resto
  de Net Worth» de `que_no_quiero`.
- R12 — (añadido) El humano no dijo qué pasa si falla la petición. Propongo que falle
  solo la parte y no la pantalla. ← REVISAR EN APROBACIÓN.
- R13 — (delegado) El humano cedió «si desde un depósito vencido se puede ir a su
  movimiento en Movements». Decido sí, al mes del vencimiento: `Movements` no tiene forma
  de señalar una línea y cambiarlo sería tocar otra pantalla. `ambiguous` no lleva enlace:
  no hay un movimiento, hay varios.
- R14 — (añadido) Tras importar, el estado de un depósito puede cambiar (aparece su
  cobro). Hoy la pantalla ya vuelve a pedir el patrimonio tras importar; los depósitos van
  en la misma recarga. ← REVISAR EN APROBACIÓN.
- R15 — (añadido) Estado de carga, igual que el que ya tiene la pantalla
  (`Loading your net worth…`).
- «Textos en inglés, en oscuro, y pnpm type-check, lint, test:unit, build e ./init.sh en
  verde» (humano, frase «[añadido por el leader]» aprobada): no es un `R<n>` propio. Los
  textos en inglés están fijados en `design.md §4`; el tema oscuro lo vigila
  `src/assets/__tests__/theme-dark.spec.ts` (ningún color crudo en un `.vue`, y los pares
  `--warning`, `--positive`, `--ink-muted` y `--ink-faint` sobre `--surface-card` ya están
  medidos); los comandos son un check.
- «No poder corregir desde aquí un depósito dudoso ni elegir su cobro» y «No tocar el
  backend» (`que_no_quiero`): la parte solo hace un `GET`; lo comprueba la prueba de R1
  (método y ruta de cada petición).
