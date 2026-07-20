**StatCard** — the core dashboard KPI tile. Big tabular-mono figure, uppercase label, signed delta (▲ green / ▼ red).

```jsx
<StatCard label="Saldo total" value={12480.55} delta={4.2} deltaLabel="vs. mes anterior"
  icon={<i data-lucide="wallet" />} />
<StatCard label="Gastos del mes" value={1844.20} delta={-2.1} accent="var(--negative)" />
```

Pass `value` as a number for auto es-ES formatting.
