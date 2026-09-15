# Spec Driven Development (SDD)

> Este harness soporta un flujo Kiro-style opt-in: requirements → design →
> tasks → code. El código no se escribe hasta que el spec está aprobado por
> un humano.
>
> SDD se activa **por feature** marcando `"sdd": true` en `feature_list.json`.
> Las features sin esa marca siguen el flujo simple (acceptance → implementer
> → reviewer → done).

## Cuándo usar SDD

- ✅ Features con varios criterios de aceptación interdependientes.
- ✅ Cambios que afectan a varios módulos o capas.
- ✅ Comportamiento con muchos casos de error.
- ✅ Algo donde te jugarías que el agente entienda mal el `acceptance` al
  vuelo si nadie lo desambigua antes.
- ❌ Features triviales (cambiar un literal, ajustar un valor por defecto).
- ❌ Bug fixes con un único síntoma y solución obvia.

## Estructura

Cada feature con `"sdd": true` tiene una carpeta dedicada en cuanto deja
`pending`:

```
specs/<nn>-<feature-name>/
├── decisions.md      # PARA EL HUMANO: una página, las decisiones y nada más
├── requirements.md   # QUÉ se necesita (EARS notation)
├── design.md         # CÓMO se construirá (decisiones técnicas)
└── tasks.md          # PASOS concretos a implementar
```

El `feature-name` coincide con el campo `name` de `feature_list.json`, y `nn`
es el `id` de la feature con **dos dígitos** (`09-net-worth-view`,
`13-import-dialog`): así la carpeta se localiza por el número y la lista sale
ordenada. Regla ya vigente en el backend desde el 2026-09-02; el humano pidió
traerla aquí el 2026-09-15. `./init.sh` exige ese nombre exacto al validar
`feature_list.json`.

`decisions.md` sigue la plantilla de `docs/decisions-template.md`. Los otros
tres son material del `implementer` y del `reviewer`.

## Las cuatro reglas de revisabilidad

> **Procedencia (2026-08-10).** Dos features SDD consumieron **tres días** solo
> en escribir y revisar sus specs, sin una línea de código: **3.844 líneas** en 6
> archivos, **95 requirements**, **42 tasks**. Diagnóstico: el spec se **escribe
> para el agente** pero se le da a **revisar al humano**, y son dos públicos
> distintos. Segundo hallazgo: de cinco pasadas de escritura, **dos se tiraron
> enteras** por redactar el spec antes de tener delante el fichero real del que
> dependía. Estas cuatro reglas salen de ahí. No las relajes sin saber lo que
> costaron.

**1. `decisions.md` es obligatorio y es lo único que se le pide leer al humano.**
En la puerta de aprobación se le enlaza **esa hoja, nunca los otros tres**. Si
algo no le convence, se cambia en los archivos técnicos: él no los abre. EARS,
procedencia, trazabilidad y firmas son maquinaria legítima para el `implementer`
y el `reviewer`; el humano necesita **las decisiones**, y sin esta hoja quedan
repartidas por cientos de líneas.

> Formato y reglas de estilo en **`docs/decisions-template.md`** (hermana de
> `docs/intent-template.md`, la de entrada, y de `docs/summary-template.md`, la
> de salida: esta es la de **revisión**). Las tres cubren el ciclo de una
> feature: el humano escribe la primera y lee las otras dos.

**2. Tope de tamaño: si no cabe en ~15 requirements, son dos features.** El
tamaño del spec es un **síntoma**, no una causa: un spec largo casi nunca es un
problema de redacción, es **una feature que hace tres cosas**. El `spec_author`
que se pase **para y propone el corte** en vez de escribir. Pasarse con una razón
dicha en voz alta vale; llegar a 40 en silencio, no.

**3. Revisión por diff: nunca «vuelve a leerte el documento».** Ante una
corrección, el agente devuelve un **changelog de cinco líneas** (qué cambió,
dónde, por qué). Re-emitir el documento entero para que el humano localice la
diferencia es lo que hace que una aclaración pequeña se sienta como empezar de
cero.

**4. Sin las entradas reales no se escribe el spec.** Si la feature depende de un
fichero, un formato, un contrato o un dato externo, no se redacta hasta tenerlo
delante: se **pide y se espera**. Escribir sobre lo que uno supone que contiene
es la vía directa al retrabajo.

Orden causal, por si hay que priorizar: la regla 2 es la que de verdad cura; la
regla 1 hace el dolor soportable mientras tanto y es la que da resultado
inmediato. Las reglas 1-3 atacan el **coste de revisión**; la 4 ataca el
**retrabajo**.

## Estados de una feature

| Estado         | Significado                                                    |
|----------------|----------------------------------------------------------------|
| `pending`      | Sin spec. El `spec_author` es el primero en actuar (si `sdd: true`); si no, el `implementer` lo toma directamente. |
| `spec_ready`   | Spec drafted (solo SDD). Esperando aprobación humana. NO se toca código. |
| `in_progress`  | Aprobado (o tomado por el implementer si no es SDD). Trabajando. |
| `done`         | Código verde, `reviewer` aprobó, sesión cerrada.               |
| `blocked`      | Atascado. Razón en `progress/current.md`.                      |

## El QUÉ lo escribe el humano (antes del spec)

Toda feature parte de un bloque `intent` que escribe el humano en
`feature_list.json` (ver `docs/intent-template.md`). Ese `intent` es la
**fuente de verdad del QUÉ y del POR QUÉ**. El `acceptance` técnico y los
`requirements` del spec son *derivaciones* de la intención, nunca la
sustituyen. El agente no inventa el QUÉ.

```
intent (humano) → acceptance (derivado) → requirements/design/tasks (spec) → código
```

## La puerta de aprobación humana

El flujo automático se detiene **una vez**: cuando el `spec_author` termina
sus cuatro archivos, marca la feature como `spec_ready` y para. El humano lee
**solo `specs/<nn>-<feature>/decisions.md`** —una página— y dice "aprobado" (o pide
cambios). Los otros tres son material del `implementer` y del `reviewer`:
**nunca se le manda a leerlos**; si necesita más detalle de una decisión, se lo
resume el `leader`. Si pide cambios, recibe un **changelog de cinco líneas**, no
el documento reescrito (ver §Las cuatro reglas de revisabilidad).

Para que ese "aprobado" sea una revisión real y no un checkbox vacío, el
`requirements.md` DEBE incluir una **sección de procedencia** (ver más abajo).
Esa sección es materia prima del `spec_author`: alimenta el bloque 🔴 de
`decisions.md`, que es lo que el humano sí ve. En la puerta, el humano revisa
dos cosas, ambas desde la hoja de decisiones:

1. **Trazabilidad:** ¿cada requirement sale de algo que yo pedí en el `intent`?
2. **Procedencia:** ¿qué se marcó como `(añadido)` o `(delegado)`? Eso es lo
   que el agente decidió por su cuenta; lo miro con lupa y lo apruebo o lo
   cambio. Aquí es donde los huecos que yo no contemplé salen a la luz
   *antes* de escribirse el código, en vez de descubrirlos después.

Solo entonces el `leader` transiciona `spec_ready → in_progress` y lanza
el `implementer`.

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → done
```

## Sección de procedencia (obligatoria en requirements.md)

Al final de `requirements.md`, el `spec_author` clasifica cada `R<n>`:

```markdown
## Procedencia

- R1 — (humano) Sale de "cuando un usuario de una sola empresa entra directo".
- R2 — (humano) Sale de "si vale para varias, muestra selector".
- R3 — (delegado) El humano cedió "cómo avisa el backend"; decido leer el
  flag `companies[]` del contrato BE-14. Alternativa descartada: endpoint
  aparte (más redondera de red).
- R4 — (añadido) El humano no dijo qué pasa si cierra el selector sin elegir.
  Propongo: se queda en login sin sesión iniciada. ← REVISAR EN APROBACIÓN.
```

- `(humano)` — trazable a una frase del `intent`.
- `(delegado)` — resuelve algo de `delego_en_agente`; explica la decisión.
- `(añadido)` — alcance que el humano no pidió; es lo primero que revisa el
  humano en la puerta. Márcalo de forma visible.

## requirements.md — EARS estricto

Las requirements se redactan en **EARS** (Easy Approach to Requirements
Syntax). Cada requirement es un párrafo numerado con uno de estos cinco
patrones:

| Patrón         | Plantilla                                                   |
|----------------|-------------------------------------------------------------|
| **Ubicuo**     | `El sistema DEBE <acción>.`                                 |
| **Evento**     | `CUANDO <disparador>, el sistema DEBE <acción>.`            |
| **Estado**     | `MIENTRAS <estado>, el sistema DEBE <acción>.`              |
| **Opcional**   | `DONDE <feature opcional>, el sistema DEBE <acción>.`       |
| **No deseado** | `SI <evento no deseado> ENTONCES el sistema DEBE <acción>.` |

Reglas duras:

- Cada requirement tiene un id estable: `R1`, `R2`, ...
- Cada requirement DEBE ser verificable por al menos un test concreto.
- Cada punto de `como_se_que_esta_bien` del `intent` DEBE estar cubierto por
  al menos un `R<n>`. Y cada `R<n>` DEBE quedar clasificado en la sección de
  procedencia (`humano` / `delegado` / `añadido`).
- No mezcles varios `DEBE` en un mismo requirement. Si hay más de uno, parte.
- No uses verbos blandos ("podría", "puede", "soporta"). Solo `DEBE` / `NO DEBE`.

Ejemplo (CLI):

```markdown
## R1
CUANDO el usuario ejecuta `app recent`, el sistema DEBE imprimir hasta 5
elementos ordenados por `created_at` descendente.

## R2
SI el flag `--limit` recibe un valor <= 0 ENTONCES el sistema DEBE imprimir
un mensaje de error en stderr y salir con código != 0.
```

Ejemplo (API):

```markdown
## R1
CUANDO un cliente hace `POST /notes` con `{title, body}` válidos, el sistema
DEBE responder con `201` y el cuerpo `{id, created_at}`.

## R2
SI `title` está vacío ENTONCES el sistema DEBE responder con `400` y un
mensaje `title is required`.
```

## design.md — decisiones técnicas

Captura **antes** de tocar código:

- Qué archivos se crean / modifican.
- Qué firmas nuevas aparecen (funciones, clases, endpoints, componentes).
- Qué excepciones / errores se reutilizan o se añaden.
- Qué alternativa se descartó y por qué (mínimo una).

NO es ingeniería desde primeros principios — apóyate en
`docs/architecture.md` y `docs/conventions.md`. El `design.md` documenta los
puntos donde tu feature roza la frontera de esas reglas.

## tasks.md — checklist ejecutable

Pasos discretos en orden, cada uno con checkbox. Cada task referencia al
menos un `R<n>` que cubre.

Ejemplo:

```markdown
- [ ] T1 — Añadir handler `cmdRecent` en `src/cli/commands.ts`. Cubre: R1, R3.
- [ ] T2 — Registrar subcomando `recent` con flag `--limit`. Cubre: R1, R2.
- [ ] T3 — Añadir `test_recent_default_limit` en `tests/cli.test.ts`. Cubre: R1.
- [ ] T4 — Añadir `test_recent_invalid_limit` en `tests/cli.test.ts`. Cubre: R2.
```

El `implementer` marca `[x]` cada task al completarla. El `reviewer`
rechaza si queda alguna `[ ]` sin justificación documentada.

## Trazabilidad (regla dura)

- Cada test nuevo debe poder mapearse a un `R<n>` de su spec.
- Cada `R<n>` debe tener al menos un test concreto.
- El `reviewer` comprueba esta correspondencia explícitamente y rechaza
  si falta.

El `implementer` documenta el mapa en `progress/implementation/<name>.md`:

```markdown
## Trazabilidad
- R1 → `test_recent_default_limit`
- R2 → `test_recent_invalid_limit`
- R3 → `test_recent_custom_limit`
```

## Cuándo NO aplica SDD

Las features sin `"sdd": true` (o sin el campo `sdd`) NO tienen spec. SDD
es opt-in: actívalo solo donde aporte. Una feature `pending` sin la marca
salta directamente al `implementer` cuando el leader la toma.
