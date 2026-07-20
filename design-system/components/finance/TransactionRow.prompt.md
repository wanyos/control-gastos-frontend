**TransactionRow** — one movement; positive amounts render green (ingreso), negative neutral-dark (gasto). Stack rows inside a Card.

```jsx
<TransactionRow merchant="Mercadona" category="Comida" categoryColor="var(--chart-6)"
  date="Hoy · 14:32" amount={-42.18} icon={<i data-lucide="shopping-cart" />} />
<TransactionRow merchant="Nómina ACME" category="Ingresos" categoryColor="var(--chart-1)"
  date="1 oct" amount={2100} />
```
