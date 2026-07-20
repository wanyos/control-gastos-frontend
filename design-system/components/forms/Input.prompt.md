**Input** — labeled text field; pair `prefix`/`suffix` for currency and units, `error` for validation.

```jsx
<Input label="Importe" prefix="€" placeholder="0,00" inputMode="decimal" />
<Input label="Concepto" hint="Aparecerá en tu historial" />
<Input label="IBAN" error="El IBAN no es válido" />
```

Focus shows the brand ring; `error` turns the border red and swaps the hint.
