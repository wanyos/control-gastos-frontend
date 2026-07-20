**Button** — primary action control; use one `primary` per view, `secondary`/`ghost` for the rest, `danger` for destructive.

```jsx
<Button variant="primary" iconLeft={<i data-lucide="plus" />}>Nuevo movimiento</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="ghost" size="sm">Ver todo</Button>
<Button variant="danger" loading>Eliminar</Button>
```

Variants: `primary` (brand green), `secondary` (outlined white), `ghost` (transparent), `danger` (red). Sizes: `sm` 32 · `md` 40 · `lg` 48. Props: `iconLeft`, `iconRight`, `fullWidth`, `loading`, `disabled`. Hover darkens, press scales to 0.97.
