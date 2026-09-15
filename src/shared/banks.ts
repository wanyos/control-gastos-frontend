// Readable bank names, shared by every view that shows a bank (feature 13; moved
// from net-worth/breakdown.ts). Not a closed list: banks are discovered from the
// Drive folders, so an unknown slug is shown as it comes.

const BANK_LABELS: Record<string, string> = {
  bankinter: 'Bankinter',
  n26: 'N26',
  openbank: 'Openbank',
  myinvestor: 'MyInvestor',
  'trade-republic': 'Trade Republic',
  revolut: 'Revolut',
}

/** Readable bank name; an unknown slug is shown as it comes (banks are discovered). */
export function bankLabel(slug: string): string {
  return BANK_LABELS[slug] ?? slug
}
