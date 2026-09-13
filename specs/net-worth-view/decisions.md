# Decisiones — F9 `net-worth-view`

> **Esto es lo único que necesitas leer para aprobar.** Los otros tres archivos
> (`requirements` / `design` / `tasks`) son material del implementer y del reviewer.
> Si algo de aquí no te convence, dilo y se cambia ahí; no hace falta que los abras.

**Qué hace:** sustituye el placeholder de `/net-worth` por la vista de Patrimonio
real: la cifra total con su frase (A), de qué está hecho por tipo y por banco con
barras (B), una ficha por banco con cada cuenta y producto (E) y los avisos de
honestidad del dato. **No toca:** la cascada ni la evolución (C, D), el backend,
los tipos ni el cliente de la feature 7, ni añade dependencias.

---

## 🔴 Confirma o corrige (0)

Ninguna abierta: todas cerradas en la revisión del 2026-09-12.

## ✅ Ya las cerraste tú (12)

- **Cifras en formato español (2026-09-12):** `1.234,56 €`, `-5,00 €`, `0,00 €` y porcentajes `38,3 %`, también con 4 cifras (sin el ajuste explícito, es-ES escribiría `1234,56 €`). Se formatean desde el texto exacto de la API; sumas y porcentajes en céntimos enteros: no se pierde un céntimo.
- **Reparto por tipo, 4 grupos (2026-09-12):** *Checking accounts* · *Savings* (cuentas de ahorro + cuenta remunerada) · *Market investments* · *Fixed-term deposits*. Suman el total.
- **Dinero parado = saldo de las cuentas corrientes (2026-09-12),** marcado *Idle money*. La cuenta remunerada no.
- **Frase del bloque A (2026-09-12):** `As of 12 Sept 2026, you have 90.162,46 € across 5 banks. 38,3 % of it is idle in checking accounts.` Nunca dice si creció.
- **«Desde cuándo hay dato» fuera de esta feature (2026-09-12):** la API no lo trae; cada ficha muestra la fecha del dato usado (`Valued 29 Aug 2026`) y queda como cabo suelto del backend.
- **e2e de humo (2026-09-12):** si se pone rojo sin backend, el smoke responde la llamada con datos de ejemplo (~10 líneas en él); primero se comprueba si pasa.
- **Barras horizontales, sin donut y sin librería de gráficos.**
- **El total se lee de la API, no se suma en el cliente.** Los grupos se suman, el total no.
- **Producto sin valoración = hueco (`No valuation`), nunca `0,00 €`,** y fuera de todas las sumas.
- **Avisos `no_valuation`, `stale_valuation`, `matured_not_closed` en inglés legible,** con nombre y fecha.
- **Textos en inglés;** los nombres que escribes tú en los JSON salen tal cual.
- **Bloques C y D fuera** hasta que el backend tenga patrimonio a una fecha.

## ⚙️ Técnicas — decididas, no necesitan tu visto bueno (8)

1. **Fechas en inglés británico, decidido por el leader:** `12 Sept 2026` (día antes que mes). Si prefieres `Sep 12, 2026` (americano), se cambia en un sitio.
2. **Depósito vencido integrado:** sigue en su banco y en *Fixed-term deposits* (la API lo suma), con `Matured 15 Aug 2026` y su aviso en el panel.
3. **Si los grupos no suman el total, se avisa en pantalla** con las dos cifras, sin corregir nada.
   ⚠️ *Efecto:* con los números del ejemplo del contrato ese aviso saldría (ver abajo).
4. **Nombres de banco legibles:** `trade-republic` → Trade Republic, etc.; un banco nuevo sale con su nombre crudo.
5. **Mientras carga se ve un indicador; si falla, un aviso con el mensaje del error.** Sin botón de reintentar.
6. **Componentes portados:** Card, Badge, StatCard y AccountCard, más una barra sacada de ProgressBar/CategoryBar. StatCard sin flecha de variación.
7. **Grupo o banco vacío no se pinta;** barras en proporción al total; saldo negativo en rojo con barra vacía.
8. **Honestidad del dato medible sin fragilidad:** funciones puras con textos exactos + marcas `data-test`, nunca nombres de clase.

## 📌 Consecuencias que te tocan a ti (no son código)

- Pedir en una sesión del backend la fecha del primer dato por producto (y anotarlo como cabo suelto en `docs/roadmap.md`).
- Provocar una vez un aviso real (un producto sin valoración) y verlo en pantalla: la base de hoy no trae ninguno.

## ⚠️ Incoherencias conocidas que se heredan

- **El ejemplo de `GET /api/net-worth` en el contrato del backend no cuadra:** 12810.75 + 10000.00 + 5208.40 = 28019.15, pero pone `investments.total` 18208.90. No se toca desde aquí; los tests usan datos propios que sí suman. Conviene corregirlo en el backend.
- La UI está en inglés con cifras en formato español (`90.162,46 €`): mezcla elegida a propósito.
- Los tests del shell que miraban el placeholder de `/net-worth` se mueven a `/overview` (tests unitarios, no el e2e).
