**Select** — styled native dropdown for filters (periodo, cuenta, categoría).

```jsx
<Select label="Periodo" options={['Este mes','Últimos 3 meses','Este año']} value={p} onChange={e=>setP(e.target.value)} />
```

`options` accepts strings or `{value,label}`.
