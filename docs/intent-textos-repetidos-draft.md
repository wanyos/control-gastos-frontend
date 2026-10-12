# Borrador de la feature 28 — Textos que salen repetidos

> **Borrador escrito por el leader para que lo corrijas.** Cambia, tacha o
> añade lo que quieras. Al final hay dos preguntas. Cuando lo des por bueno, lo
> copio a `feature_list.json` y borro este archivo.

## De dónde sale (para situarte)

Sale de dos notas tuyas de la revisión, en `Movements` (6 de octubre) y en
`Review` (8 de octubre):

- **El banco sale dos veces.** Anotaste: «no me gusta como está el texto del
  select ni como se ponen los nombres de los bancos, es un string que repite dos
  veces el mismo nombre». Lo que se ve hoy es `Bankinter · bankinter ···2314`,
  en el desplegable `Account` y en cada línea de la lista. En `Review` anotaste
  lo mismo: «los nombres de banco en el select, están duplicados».
- **Cada categoría sale dos veces.** Anotaste: «aparecen siempre dos líneas
  repetidas de la misma categoría». Lo comprobé: pasa en el desplegable que se
  abre al pulsar la etiqueta de categoría de una línea. Sale `Supermercado` como
  título de grupo y debajo `Supermercado` otra vez como opción, y así con todas.

Son los cabos sueltos 16 y 17 del roadmap. Esta feature arregla eso y nada más.

## Qué quiero que pase

Que cada cuenta se nombre una sola vez, sin repetir el banco, en todos los
sitios donde aparece. Y que en los desplegables de categoría cada categoría
salga una sola vez.

## Por qué lo quiero

Porque el texto repetido estorba al leer: en una lista de cien movimientos, el
nombre del banco dos veces en cada línea es ruido, y en el desplegable no sé si
las dos líneas iguales son dos categorías distintas.

## Cómo sabré que está bien

- En `Movements`, el desplegable `Account` nombra cada cuenta sin repetir el
  banco.
- En `Movements`, cada línea de la lista nombra la cuenta sin repetir el banco.
- En `Review`, lo mismo en el desplegable de cuenta y en cada fila.
- En cualquier otra pantalla donde salga una cuenta (`Transfers`, `Net Worth`),
  se nombra igual que en estas.
- Al pulsar la etiqueta de categoría de una línea en `Movements`, cada
  categoría sale una sola vez.
- En `Review`, lo mismo en el desplegable de categoría de cada fila y en el de
  la barra que sale al marcar varias.
- Sigo distinguiendo dos cuentas del mismo banco, si algún día las tengo.
- Si algún día una categoría tiene subcategorías, salen agrupadas bajo ella.

## Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero que cambie qué hace ningún desplegable: solo lo que se lee.
- No quiero cambiar los nombres de las categorías ni su idioma.

## Lo que NO sé y delego en el agente

- En qué sitios exactos sale hoy el nombre de una cuenta, para cambiarlos todos
  a la vez.
- Cómo se enseñan las subcategorías el día que existan, sin repetir la
  categoría cuando no las tiene.

## Preguntas para ti

1. **¿Cómo quieres leer una cuenta?** Hoy sale `Bankinter · bankinter ···2314`.
   Opciones:
   - a) `Bankinter ···2314` — el banco y los cuatro últimos dígitos. Es la que
     yo pondría: corta, y distingue dos cuentas del mismo banco.
   - b) `Bankinter` — solo el banco. Más limpio, pero si tienes dos cuentas en
     un banco no se distinguen.
   - c) Otra que prefieras.

2. **¿Entra también el orden de las categorías?** Hoy salen primero las de
   gasto por orden alfabético y luego las de ingreso. Yo no lo tocaría en esta
   feature.
