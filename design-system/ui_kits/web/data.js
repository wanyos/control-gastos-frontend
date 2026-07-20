// control·cuentas — mock data for the web dashboard UI kit
window.CC_DATA = {
  user: { name: 'Lucía Romero', email: 'lucia@control-cuentas.es' },
  totalBalance: 18244.93,
  month: 'Octubre 2025',
  kpis: [
    { label: 'Saldo total', value: 18244.93, delta: 4.2, deltaLabel: 'vs. mes anterior', icon: 'wallet' },
    { label: 'Ingresos', value: 3120.00, delta: 1.8, deltaLabel: 'este mes', icon: 'trending-up' },
    { label: 'Gastos', value: 1844.20, delta: -2.1, deltaLabel: 'este mes', accent: 'var(--negative)', icon: 'trending-down' },
    { label: 'Ahorro', value: 1275.80, delta: 12.4, deltaLabel: 'este mes', icon: 'piggy-bank' },
  ],
  accounts: [
    { name: 'BBVA Nómina', type: 'Cuenta corriente', last4: '4471', balance: 3204.18, color: 'var(--chart-3)', logo: 'B' },
    { name: 'Sabadell Ahorro', type: 'Cuenta de ahorro', last4: '8820', balance: 9860.55, color: 'var(--chart-2)', logo: 'S' },
    { name: 'Revolut', type: 'Cuenta digital', last4: '1133', balance: 642.40, color: 'var(--chart-8)', logo: 'R' },
    { name: 'Visa Oro', type: 'Tarjeta de crédito', last4: '0092', balance: -512.40, color: 'var(--chart-7)', logo: 'V' },
    { name: 'Inversiones', type: 'Cartera indexada', last4: '—', balance: 5050.20, color: 'var(--chart-4)', logo: 'I' },
  ],
  categories: [
    { name: 'Vivienda', color: 'var(--chart-4)', spent: 950, budget: 1000, icon: 'home' },
    { name: 'Comida', color: 'var(--chart-6)', spent: 420, budget: 600, icon: 'utensils' },
    { name: 'Transporte', color: 'var(--chart-8)', spent: 165, budget: 200, icon: 'car' },
    { name: 'Ocio', color: 'var(--chart-5)', spent: 310, budget: 250, icon: 'party-popper' },
    { name: 'Suscripciones', color: 'var(--chart-7)', spent: 64, budget: 80, icon: 'repeat' },
  ],
  // ingresos vs gastos for last 6 months
  flow: [
    { m: 'May', in: 2900, out: 2100 },
    { m: 'Jun', in: 3100, out: 1950 },
    { m: 'Jul', in: 2950, out: 2350 },
    { m: 'Ago', in: 3000, out: 1780 },
    { m: 'Sep', in: 3120, out: 1884 },
    { m: 'Oct', in: 3120, out: 1844 },
  ],
  transactions: [
    { merchant: 'Nómina ACME S.L.', category: 'Ingresos', categoryColor: 'var(--chart-1)', date: 'Hoy · 09:01', amount: 2100, icon: 'banknote' },
    { merchant: 'Mercadona', category: 'Comida', categoryColor: 'var(--chart-6)', date: 'Hoy · 14:32', amount: -42.18, icon: 'shopping-cart' },
    { merchant: 'Endesa Luz', category: 'Vivienda', categoryColor: 'var(--chart-4)', date: 'Ayer', amount: -78.40, icon: 'home', pending: true },
    { merchant: 'Netflix', category: 'Suscripciones', categoryColor: 'var(--chart-7)', date: '3 oct', amount: -13.99, icon: 'repeat' },
    { merchant: 'Cabify', category: 'Transporte', categoryColor: 'var(--chart-8)', date: '3 oct', amount: -9.80, icon: 'car' },
    { merchant: 'Transferencia · Ahorro', category: 'Ahorro', categoryColor: 'var(--chart-2)', date: '2 oct', amount: -300, icon: 'piggy-bank' },
    { merchant: 'Bizum · Marc', category: 'Ingresos', categoryColor: 'var(--chart-1)', date: '1 oct', amount: 25, icon: 'arrow-down-left' },
    { merchant: 'Spotify', category: 'Suscripciones', categoryColor: 'var(--chart-7)', date: '1 oct', amount: -10.99, icon: 'repeat' },
  ],
  upcoming: [
    { merchant: 'Alquiler', date: '5 oct', amount: -850 },
    { merchant: 'Seguro coche', date: '12 oct', amount: -64.20 },
    { merchant: 'Gimnasio', date: '15 oct', amount: -29.99 },
  ],
};
